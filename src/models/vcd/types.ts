import type Color           from 'color'



export interface Vcd {
    date      ?: Date
    version   ?: string
    
    timescale  : number
    rootModule : VcdModule
}

export interface VcdModule {
    name       : string
    submodules : VcdModule[]
    
    variables  : VcdVariable[]
}

export interface VcdVariable {
    name       : string
    alias      : string
    
    type       : string
    size       : number
    msb        : number|undefined
    lsb        : number|undefined
    waves      : VcdWave[]
    
    // extra data:
    id         : number
    format     : VcdValueFormat
    color      : Color|null
}

export enum VcdValueFormat {
    BINARY,
    DECIMAL,
    HEXADECIMAL,
}

export interface VcdWave {
    tick       : number
    value      : number|string
}

export interface VcdWaveExtended extends VcdWave {
    lastTick   : number
    prevValue  : number|string | undefined
    nextValue  : number|string | undefined
}



export interface VcdMask {
    name       : string
    color     ?: Color|null
    
    timescale  : number
    maxTime   ?: number
}



export type VcdToken =
    |'DATE'
    |'VERSION'
    |'TIMESCALE'
    |'MODULE'
    |'DUMPVARS'