import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity()
export class Event {
  @PrimaryColumn()
  entityType: string;

  @PrimaryColumn()
  @Index()
  id: string;

  @PrimaryColumn()
  method: string;

  @PrimaryColumn()
  version: number;

  @Column()
  snapshotVersion: number;

  @Column({ type: "bigint" })
  timestamp: number;

  @Column({ type: "jsonb" })
  data: any;

  @Column()
  snapshot: boolean;
}
