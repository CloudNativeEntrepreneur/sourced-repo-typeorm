import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
export class Event {
  @PrimaryGeneratedColumn({ type: "bigint" })
  _id: string;

  @Column()
  @Index()
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

  @Column()
  snapshot: boolean;
}
