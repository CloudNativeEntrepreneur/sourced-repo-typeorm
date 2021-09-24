import { EventEmitter } from "eventemitter3";
import { persistenceLayer } from "./persistenceLayer";
import { Event } from "./Event";
import { MoreThan, Connection, Repository as TypeORMRepository } from "typeorm";
import debug from "debug";

const log = debug("sourced-repo-typeorm");

interface RepositoryOptions {
  indices: string[];
  forceSnapshot: boolean;
  snapshotFrequency: number;
}

export class Repository extends EventEmitter {
  EntityType: any;
  connection: Connection;
  forceSnapshot: boolean;
  indices: string[];
  options: RepositoryOptions;
  snapshotFrequency: number;
  events: TypeORMRepository<Event>;

  constructor(
    EntityType,
    options = {
      indices: [],
      forceSnapshot: false,
      snapshotFrequency: 10,
    }
  ) {
    super();

    if (!persistenceLayer.connection) {
      throw new Error(
        "🚨 persistenceLayer has not been initialized. you must call require('sourced-repo/persistenceLayer').connect(connectionOptions); before instantiating a Repository"
      );
    }

    const connection = persistenceLayer.connection;
    this.connection = connection;

    const indices = [...new Set([...options.indices, ...["id"]])];

    this.EntityType = EntityType;
    this.indices = indices;
    this.snapshotFrequency = options.snapshotFrequency;
    this.forceSnapshot = options.forceSnapshot;

    this.events = this.connection.getRepository(Event);

    log(`✅ "${this.EntityType.name}" events store ready`);

    this.emit("ready");
  }

  async commit(entity) {
    log(`⏳ committing ${this.EntityType.name} for id ${entity.id}`);
    await this._commitEvents(entity);
    this._emitEvents(entity);
    return entity;
  }

  async get(id) {
    const entity = await this._getByIndex("id", id);
    return entity;
  }

  async _getByIndex(index, value) {
    log(`⏳ getting ${this.EntityType.name} where "${index}" is "${value}"`);

    const snapshot = await this.events.findOne({
      order: {
        version: "DESC",
      },
      where: [
        {
          snapshot: true,
          entityType: this.EntityType.name,
          [index]: value,
        },
      ],
    });

    const events = await this.events.find({
      order: {
        version: "ASC",
      },
      where: [
        {
          snapshot: false,
          entityType: this.EntityType.name,
          [index]: value,
          version: MoreThan(snapshot?.version || 0),
        },
      ],
    });

    log(
      `⏳ results for ${this.EntityType.name} where "${index}" is "${value}"`,
      { snapshot: !!snapshot, events: events.length }
    );

    if (!snapshot && !events.length) {
      return null;
    }

    const id = index === "id" ? value : snapshot ? snapshot.id : events[0].id;

    const entity = this._deserialize(id, snapshot?.data, events);
    return entity;
  }

  async _commitEvents(entity) {
    if (entity.newEvents.length === 0) return null;

    if (!entity.id) {
      throw new Error(
        `🚨 Cannot commit an entity of type ${this.EntityType} without an [id] property`
      );
    }

    const newEvents = entity.newEvents;
    newEvents.forEach((event) => {
      this.indices.forEach(function (index) {
        event[index] = entity[index];
      });
    });

    const eventObjects = newEvents.map((newEvent) => {
      const event = new Event();
      event.id = entity.id;
      event.version = newEvent.version;
      event.snapshotVersion = entity.snapshotVersion;
      event.timestamp = newEvent.timestamp;
      event.method = newEvent.method;
      event.entityType = this.EntityType.name;
      event.data = newEvent.data;
      event.snapshot = false;
      return event;
    });

    if (
      this.forceSnapshot ||
      entity.version >= entity.snapshotVersion + this.snapshotFrequency
    ) {
      const snapshot = entity.snapshot();

      const snapshotEvent = new Event();
      snapshotEvent.snapshot = true;
      snapshotEvent.method = "snapshot";
      snapshotEvent.data = snapshot;
      snapshotEvent.id = snapshot.id;
      snapshotEvent.version = snapshot.version;
      snapshotEvent.snapshotVersion = snapshot.snapshotVersion;
      snapshotEvent.timestamp = snapshot.timestamp;
      snapshotEvent.entityType = this.EntityType.name;

      eventObjects.push(snapshotEvent);
    }
    log("⏳ Inserting event objects", { eventObjects: eventObjects.length });
    await this.events.insert(eventObjects);
    entity.newEvents = [];

    log(`✅ committed ${this.EntityType.name}.events for id ${entity.id}`);

    return entity;
  }

  _deserialize(id, snapshot, events) {
    log("⏳ deserializing %s entity ", this.EntityType.name);
    const entity = new this.EntityType(snapshot, events);
    entity.id = id;
    return entity;
  }

  _emitEvents(entity) {
    const eventsToEmit = entity.eventsToEmit;
    log("⏳ emitting events", { eventsToEmit: eventsToEmit.length });
    entity.eventsToEmit = [];
    eventsToEmit.forEach((eventToEmit) => {
      const args = Array.prototype.slice.call(eventToEmit);
      this.EntityType.prototype.emit.apply(entity, args);
    });

    log(`✅ emitted local events for id ${entity.id}`);
  }
}
