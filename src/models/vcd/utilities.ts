import {
    type VcdWave,
    VcdValueFormat,
}           from './types'



export const vcdValueToString = (value: VcdWave['value'], format: VcdValueFormat): string => {
    switch (format) {
        case VcdValueFormat.BINARY      : return value.toString(2);
        case VcdValueFormat.DECIMAL     : return value.toString(10);
        case VcdValueFormat.HEXADECIMAL : return value.toString(16);
        default:                          return value.toString();
    } // switch
}