import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

export enum EventType {
  Event,
  Snapshot,
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  _id: string;

  @Column()
  @Index()
  id: string;

  @Column()
  @Index()
  version: number;

  @Column()
  @Index()
  snapshotVersion: number;

  @Column({ type: "bigint" })
  timestamp: number;

  @Column()
  @Index()
  method: string;

  @Column()
  @Index()
  entityType: string;

  @Column({ type: "jsonb" })
  data: any;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.Event
  })
  @Index()
  type: EventType;
}
