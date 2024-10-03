import {
    type VcdWave,
    VcdValueFormat,
}                           from './types'
import  Color               from 'color'



export const vcdValueToString = (value: VcdWave['value'], format: VcdValueFormat): string => {
    switch (format) {
        case VcdValueFormat.BINARY      : return value.toString(2);
        case VcdValueFormat.DECIMAL     : return value.toString(10);
        case VcdValueFormat.HEXADECIMAL : return value.toString(16);
        default:                          return value.toString();
    } // switch
}



export const defaultColorOptions : Color[] = [
    Color('#B5CEA8'),
    Color('#FF0101'),
    Color('#CC01AF'),
    Color('#BA01FF'),
    Color('#7409A5'),
    Color('#0101FF'),
    Color('#01AEAE'),
    Color('#017A01'),
    Color('#01FF01'),
    Color('#FFFF01'),
    Color('#FEB301'),
    Color('#FF4701'),
];
