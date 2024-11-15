'use client'

import { useState } from "react";
import { decodeVcdFromFileContent, encodeVcdToFileContent, VcdViewer, VcdEditor } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import { useEvent } from "@reusable-ui/core";
import { VcdClockGuide, VcdMask, VcdValueFormat, type Vcd } from "@/models";
import Color from 'color'



const blankSampleVcd : Vcd|null = {
    version                    : 'A sample blank vcd',
    timescale                  : 1 * (0.1 ** 9),
    rootModule                 : {
        name                   : 'root',
        variables              : [],
        submodules             : [
            {
                name           : 'sample',
                variables      : [
                    {
                        name   : 'clock',
                        alias  : 'c',
                        
                        type   : 'wire',
                        size   : 1,
                        lsb    : 0,
                        msb    : 1,
                        waves  : (new Array(100)).fill(null).map((_, index) => ({
                            tick  : index * 5,
                            value : index % 2,
                        })),
                        
                        id     : 1,
                        format : VcdValueFormat.BINARY,
                        color  : Color('#ff0000'),
                    },
                    {
                        name   : 'random',
                        alias  : 'r',
                        
                        type   : 'reg',
                        size   : 8,
                        lsb    : 0,
                        msb    : 15,
                        waves  : (new Array(25)).fill(null).map((_, index) => ({
                            tick  : index * 20,
                            value : Math.round(Math.random() * 1000) % 16,
                        })),
                        
                        id     : 1,
                        format : VcdValueFormat.HEXADECIMAL,
                        color  : Color('green'),
                    },
                ],
                submodules : [],
            }
        ],
    },
};

const sampleMask : VcdMask[] = [
    {
        name      : 'tb.clk',
        color     : Color('#00ff00'),
        
        timescale : 1 * (0.1 ** 9), // 1ns
        maxTime   : 300,
    },
    {
        name      : 'tb.seed',
        color     : Color('#ff0000'),
        
        timescale : 1 * (0.1 ** 9), // 1ns
        maxTime   : 300,
    },
];

const sampleClockGuide : VcdClockGuide = {
    name          : 'sync',
    alias         : '~', // the alias character when saved back to *.vcd file
    type          : 'wire',
    color         : Color('#00ff00'),
    
    timescale     : undefined, // undefined = >inherits vcd_file's timescale
    // timescale     : 1 * (0.1 ** 9), // 1ns
    
    minTime       : 0,
    maxTime       : undefined, // undefined => defaults to vcd_file's duration.
    
    startingValue : true, // true => starts with 'HI', false => starts with 'LOW'
    flipInterval  : 5, // every (5 * timescale) the value flips to opposite value
}



export default function Home() {
    const [inMemoryFile, setInMemoryFile] = useState<Vcd|null>(() => decodeVcdFromFileContent(vcdContent));
    const [vcdVersion, setVcdVersion] = useState<any>(() => new Date());
    
    const handleFileOpen = useEvent<React.ChangeEventHandler<HTMLInputElement>>(async (event) => {
        const file : File|null = event.currentTarget.files?.[0] ?? null;
        if (!file) return;
        
        const fileContent = await file.text();
        const newVcd = decodeVcdFromFileContent(fileContent);
        setInMemoryFile(newVcd);
        setVcdVersion(new Date(file.lastModified));
        
        
        event.target.value = ''; // reset the value in order to the next onChange can be re-triggered when opened the same file again
    });
    
    const handleFileSave = useEvent(() => {
        const link = document.createElement('a');
        const file = new Blob([encodeVcdToFileContent(inMemoryFile) ?? ''], { type: 'text/plain' });
        link.href = URL.createObjectURL(file);
        link.download = 'test.vcd';
        link.click();
    });
    
    const [enableMask, setEnableMask] = useState<boolean>(false);
    const handleMaskChange = useEvent<React.ChangeEventHandler<HTMLInputElement>>(({target: {checked}}) => {
        setEnableMask(checked);
    });
    
    const [enableClockGuide, setEnableClockGuide] = useState<boolean>(true);
    const handleEnableClockChange = useEvent<React.ChangeEventHandler<HTMLInputElement>>(({target: {checked}}) => {
        setEnableClockGuide(checked);
    });
    
    
    /*
        NOTE Using <VcdEditor> in cra/next-js:
        
        * Please add icon set support by copying 'fonts/**' and 'icons/**' folders into '/public' directory
        
        * Next-JS: Please add <html><head><StylesCSR /> and <html><head><StylesSSR /> to '/src/app/layout.tsx'
        * CRA    : Please add <React.StrictMode><StylesCSR /> to '/index.tsx'
        
        * Please copy '/src/app/components/**' and '/src/app/models/**' into your app (the location is up to you, then modify the relative path if needed)
    */
    return (
        <div>
            <div style={{ display: 'grid', height: '70vh' }}>
                <VcdEditor
                    // accessibilities: (default is true)
                    // canDeleteTransition = {false}
                    // canSetTransition    = {false}
                    // canInsertTransition = {false}
                    // canSetTimescale     = {false}
                    // canSetDuration      = {false}
                    // canNewDocument      = {false}
                    
                    // `vcd` and `onVcdChange` are GETTER and SETTER of the editor's in_memory_file:
                    vcd={inMemoryFile}
                    onVcdChange={setInMemoryFile}
                    
                    // not needed anymore, since we're using `vcd` and `onVcdChange` as the temporary in_memory_database:
                    // vcdVersion={vcdVersion}
                    
                    // a new blank document definition:
                    vcdBlank={blankSampleVcd}
                    
                    // a masking file:
                    vcdMask={enableMask ? sampleMask : undefined}
                    
                    // a clock guide:
                    vcdClockGuide={enableClockGuide ? sampleClockGuide : undefined}
                />
            </div>
            <hr />
            <p>
                Open a *.vcd file from your computer:
            </p>
            <input type='file' accept='.vcd' onChange={handleFileOpen} multiple={false} />
            <hr />
            <p>
                Save a *.vcd file to your computer:
            </p>
            <button type='button' onClick={handleFileSave}>
                Start Download
            </button>
            <hr />
            <label>
                <input type='checkbox' onChange={handleMaskChange} checked={enableMask} />
                <span>Enable mask</span>
            </label>
            <br />
            <label>
                <input type='checkbox' onChange={handleEnableClockChange} checked={enableClockGuide} />
                <span>Enable clock guide</span>
            </label>
            {/* <p>parsed:</p>
            <pre>
                {JSON.stringify(inMemoryFile, undefined, 4)}
            </pre> */}
        </div>
    );
}
