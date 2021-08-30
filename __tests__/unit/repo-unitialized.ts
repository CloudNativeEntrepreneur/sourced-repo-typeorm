import { Repository } from '../../src/index'
import { persistenceLayer } from '../../src/persistenceLayer'
import { Entity } from 'sourced'

class Person extends Entity {
  name: string
  age: number

  constructor(snapshot, events) {
    super()

    this.name = ''
    this.age = 0

    this.rehydrate(snapshot, events)
  }

  setName(name: string) {
    this.name = name
    this.digest('setName', name)
    this.enqueue('name.set')
  }
  
  setAge(age: number) {
    this.age = age
    this.digest('setAge', age)
    this.enqueue('age.set')
  }
}

const postgresConnectionUrl = process.env.POSTGRES_URL || 'postgres://sourced:sourced@sourced-postgres.default.svc.cluster.local:5432/sourced'

jest.mock('../../src/persistenceLayer', () => ({
  persistenceLayer: {
    connect: jest.fn()
  }
}))

describe('sourced-repo-postgresql', () => {
  
  it('should throw an error if trying to initialize a repository before connection has been established', () => {    
    try {
      new Repository(Person)
    } catch (err) {
      expect(err).toEqual(new Error("persistenceLayer has not been initialized. you must call require('sourced-repo/persistenceLayer').connect(connectionOptions); before instantiating a Repository"))
    }
  })
  
})
