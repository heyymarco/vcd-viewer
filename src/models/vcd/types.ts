export interface Vcd {
    date      ?: Date
    version   ?: string
    
    timescale  : number
    rootModule : VcdModule
}

export interface VcdModule {
    name       : string
    submodules : VcdModule[]
    
    signals    : VcdSignal[]
}

export interface VcdSignal {
    name       : string
    alias      : string
    
    size       : number
    msb        : number
    lsb        : number
    waves      : VcdWave[]
}

export interface VcdWave {
    time       : number
    value      : number
}


export type VcdToken =
    |'DATE'
    |'VERSION'
    |'TIMESCALE'
    |'MODULE'
