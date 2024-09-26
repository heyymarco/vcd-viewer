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
    msb        : number
    lsb        : number
    waves      : VcdWave[]
}

export interface VcdWave {
    tick       : number
    value      : number|string
}


export type VcdToken =
    |'DATE'
    |'VERSION'
    |'TIMESCALE'
    |'MODULE'
    |'DUMPVARS'