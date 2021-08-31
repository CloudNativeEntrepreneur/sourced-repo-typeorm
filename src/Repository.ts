import { EventEmitter } from "eventemitter3";
import { persistenceLayer } from "./persistenceLayer";
import { Event, EventType } from "./Event";
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
        "persistenceLayer has not been initialized. you must call require('sourced-repo/persistenceLayer').connect(connectionOptions); before instantiating a Repository"
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

    log(`"${this.EntityType.name}" events store ready`);

    this.emit("ready");
  }

  async commit(entity) {
    log(`committing ${this.EntityType.name} for id ${entity.id}`);

    try {
      await this._commitEvents(entity);
    } catch (err) {
      log(err);
      throw err;
    }

    this._emitEvents(entity);
    return this;
  }

  get(id) {
    return this._getByIndex("id", id);
  }

  async _getByIndex(index, value) {
    log(`getting ${this.EntityType.name} where "${index}" is "${value}"`);

    const snapshot = await this.events.findOne({
      order: {
        version: "DESC",
      },
      where: [
        {
          type: EventType.Snapshot,
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
          type: EventType.Event,
          entityType: this.EntityType.name,
          [index]: value,
          version: MoreThan(snapshot?.version || 0),
        },
      ],
    });

    log({ snapshot, events });

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
        `Cannot commit an entity of type ${this.EntityType} without an [id] property`
      );
    }

    log({ entity, originalNewEvents: entity.newEvents });

    const newEvents = entity.newEvents;
    newEvents.forEach((event) => {
      this.indices.forEach(function (index) {
        event[index] = entity[index];
      });
    });
    log({ newEvents });

    const eventObjects = newEvents.map((newEvent) => {
      const event = new Event();
      event.id = entity.id;
      event.version = newEvent.version;
      event.snapshotVersion = entity.snapshotVersion;
      event.timestamp = newEvent.timestamp;
      event.method = newEvent.method;
      event.entityType = this.EntityType.name;
      event.data = newEvent.data;
      event.type = EventType.Event;
      return event;
    });

    if (
      this.forceSnapshot ||
      entity.version >= entity.snapshotVersion + this.snapshotFrequency
    ) {
      const snapshot = entity.snapshot();

      log({ snapshot });
      const snapshotEvent = new Event();
      snapshotEvent.type = EventType.Snapshot;
      snapshotEvent.method = "snapshot";
      snapshotEvent.data = snapshot;
      snapshotEvent.id = snapshot.id;
      snapshotEvent.version = snapshot.version;
      snapshotEvent.snapshotVersion = snapshot.snapshotVersion;
      snapshotEvent.timestamp = snapshot.timestamp;
      snapshotEvent.entityType = this.EntityType.name;

      eventObjects.push(snapshotEvent);
    }

    log({ eventObjects });

    try {
      await this.events.insert(eventObjects);
    } catch (err) {
      log("failed to insert new events", err);
      throw err;
    }
    entity.newEvents = [];

    log(`committed ${this.EntityType.name}.events for id ${entity.id}`);

    return entity;
  }

  _deserialize(id, snapshot, events) {
    log("deserializing %s entity ", this.EntityType.name);
    const entity = new this.EntityType(snapshot, events);
    entity.id = id;
    return entity;
  }

  _emitEvents(entity) {
    log("emitting events");
    const eventsToEmit = entity.eventsToEmit;
    entity.eventsToEmit = [];
    eventsToEmit.forEach((eventToEmit) => {
      const args = Array.prototype.slice.call(eventToEmit);
      this.EntityType.prototype.emit.apply(entity, args);
    });

    log(`emitted local events for id ${entity.id}`);
  }
}
