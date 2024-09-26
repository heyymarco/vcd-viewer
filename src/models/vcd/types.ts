export interface VcdFile {
    date      ?: Date
    version   ?: string
    
    timescale  : number
    signals    : VcdSignal[]
}

export interface VcdSignal {
    modules    : string[]
    
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
