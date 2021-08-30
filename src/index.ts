import { EventEmitter } from 'eventemitter3'
import { persistenceLayer } from './persistenceLayer'
import { Event, EventType } from './Event'
import { MoreThan, Connection, Repository as TypeORMRepository } from 'typeorm'
import debug from 'debug'

const log = debug('sourced-repo')

interface RepositoryOptions {
  indices: string[]
  forceSnapshot: boolean,
  snapshotFrequency: number
}

export class Repository extends EventEmitter {
  EntityType: any
  connection: Connection
  forceSnapshot: boolean
  indices: string[]
  options: RepositoryOptions
  snapshotFrequency: number
  events: TypeORMRepository<Event>

  constructor (
    EntityType,
    options = {
      indices: [],
      forceSnapshot: false,
      snapshotFrequency: 10
    }
  ) {
    super()

    if (!persistenceLayer.connection) {
      throw new Error('persistenceLayer has not been initialized. you must call require(\'sourced-repo/persistenceLayer\').connect(connectionOptions); before instantiating a Repository')
    }

    const connection = persistenceLayer.connection
    this.connection = connection

    const indices = [
      ...new Set(
        [
          ...options.indices, 
          ...[
            'id',
            'method',
            'type',
            'entityType',
            'version'
          ]
        ]
      )
    ]

    this.EntityType = EntityType
    this.indices = indices
    this.snapshotFrequency = options.snapshotFrequency
    this.forceSnapshot = options.forceSnapshot

    this.events = this.connection.getRepository(Event)

    log(`"${this.EntityType.name}" events store ready`)

    this.emit('ready')
  }

  async commit (entity) {
    log(`committing ${this.EntityType.name} for id ${entity.id}`)

    try {
      await this._commitEvents(entity)
    } catch (err) {
      console.error(err)
      throw err
    }

    // try {
    //   await this._commitSnapshots(entity)
    // } catch (err) {
    //   console.error(err)
    //   throw err
    // }

    this._emitEvents(entity)
    return this
  }

  get (id, cb) {
    return this._getByIndex('id', id, cb)
  }

  _getByIndex (index, value, cb) {
    const self = this

    return new Promise(async (resolve, reject) => {
      log(`getting ${this.EntityType.name} where "${index}" is "${value}"`)

      const snapshot = await this.events.findOne({
        order: {
          version: "DESC"
        },
        where: [
          { type: 'Snapshot' },
          { entityType: this.EntityType.name },
          { [index]: value }
        ]
      })

      const events = await this.events.find({
        order: {
          version: "ASC"
        },
        where: [
          { type: 'Event' },
          { entityType: this.EntityType.name },
          { [index]: value },
          { version: MoreThan(snapshot.version) }
        ]
      })

      log({ snapshot, events })

      if (!snapshot && !events.length) {
        return resolve(null)
      }

      const id = index === 'id' ? value : snapshot ? snapshot.id : events[0].id

      const entity = self._deserialize(id, snapshot, events)
      return resolve(entity)
    })
  }

  _commitEvents (entity) {
    return new Promise(async (resolve, reject) => {
      if (entity.newEvents.length === 0) return resolve(null)

      if (!entity.id) {
        return reject(
          new Error(
            `Cannot commit an entity of type ${this.EntityType} without an [id] property`
          )
        )
      }

      const newEvents = entity.newEvents
      newEvents.forEach((event) => {
        this.indices.forEach(function (index) {
          event[index] = entity[index]
        })
      })

      const eventObjects = newEvents.map(newEvent => {
        let event = new Event()
        event.id = newEvent.id
        event.version = newEvent.version
        event.snapshotVersion = newEvent.snapshotVersion
        event.timestamp = newEvent.timestamp
        event.method = newEvent.method
        event.entityType = this.EntityType
        event.data = newEvent.data
        event.type = EventType.Event
      })

      try {
        await this.events.insert(eventObjects)
      } catch (err) {
        log('failed to insert new events', err)
        throw err
      }
      entity.newEvents = []

      log(`committed ${this.EntityType.name}.events for id ${entity.id}`)

      resolve(entity)
    })
  }

  // _commitSnapshots (entity) {
  //   const self = this

  //   return new Promise((resolve, reject) => {
  //     if (
  //       self.forceSnapshot ||
  //       entity.version >= entity.snapshotVersion + self.snapshotFrequency
  //     ) {
  //       const snapshot = entity.snapshot()
  //       // put new one at the beginning for premptive sorting
  //       this.snapshots.update((previousSnapshots) => [
  //         snapshot,
  //         ...previousSnapshots
  //       ])

  //       log(
  //         `committed ${self.EntityType.name}.snapshot for id ${entity.id}`,
  //         snapshot
  //       )

  //       return resolve(entity)
  //     } else {
  //       return resolve(entity)
  //     }
  //   })
  // }

  _deserialize (id, snapshot, events) {
    log('deserializing %s entity ', this.EntityType.name)
    const entity = new this.EntityType(snapshot, events)
    entity.id = id
    return entity
  }

  _emitEvents (entity) {
    log('emitting events')
    const self = this

    const eventsToEmit = entity.eventsToEmit
    entity.eventsToEmit = []
    eventsToEmit.forEach(function (eventToEmit) {
      const args = Array.prototype.slice.call(eventToEmit)
      self.EntityType.prototype.emit.apply(entity, args)
    })

    log('emitted local events for id %s', entity.id)
  }
}
