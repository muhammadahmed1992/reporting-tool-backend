import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Andriod2 {
    @PrimaryColumn({ type: 'char', length: 23 })
    candpk: string;
  
    @Column({ type: 'varchar', length: 40 })
    canddesc: string;
  
    @Column({ type: 'varchar', length: 40 })
    candpw: string;
  
    @Column({ type: 'int', unsigned: true, nullable: true })
    nandbeli: number;
  
    @Column({ type: 'int', unsigned: true, nullable: true })
    nandjual: number;
  
    @Column({ type: 'int', unsigned: true, nullable: true })
    nandstock: number;
  
    @Column({ type: 'int', unsigned: true, nullable: true })
    nandsuspend: number;
  
    @Column({ type: 'int', nullable: true })
    nandpos: number;
  
    @Column({ type: 'int', nullable: true })
    nandopname: number;
  
    @Column({ type: 'int', nullable: true })
    nandlaporan: number;
  
    @Column({ type: 'varchar', length: 23, nullable: true })
    candfkwhs: string;
  
    @Column({ type: 'varchar', length: 20 })
    candip: string;
}