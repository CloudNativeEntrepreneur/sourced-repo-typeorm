import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

export enum EventType {
  Event,
  Snapshot,
}

@Entity()
export class Event {
  @PrimaryColumn()
  id: string;

  @Column()
  version: number;

  @Column()
  snapshotVersion: number;

  @CreateDateColumn({ type: "timestamp" })
  timestamp: Date;

  @Column()
  method: string;

  @Column()
  entityType: string;

  @Column({ type: "jsonb" })
  data: any;

  @Column()
  type: EventType;
}
