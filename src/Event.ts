import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum EventType {
  Event,
  Snapshot,
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  _id: string;

  @Column()
  id: string;

  @Column()
  version: number;

  @Column()
  snapshotVersion: number;

  @Column({ type: "bigint" })
  timestamp: number;

  @Column()
  method: string;

  @Column()
  entityType: string;

  @Column({ type: "jsonb" })
  data: any;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.Event
  })
  type: EventType;
}
