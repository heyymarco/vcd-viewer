'use client'

import { useState } from "react";
import { decodeVcdFromFileContent, encodeVcdToFileContent, VcdViewer, VcdEditor } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import { useEvent } from "@reusable-ui/core";
import { VcdValueFormat, type Vcd } from "@/models";
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
    });
    
    const handleFileSave = useEvent(() => {
        const link = document.createElement('a');
        const file = new Blob([encodeVcdToFileContent(inMemoryFile) ?? ''], { type: 'text/plain' });
        link.href = URL.createObjectURL(file);
        link.download = 'test.vcd';
        link.click();
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
                    // `vcd` and `onVcdChange` are GETTER and SETTER of the editor's in_memory_file:
                    vcd={inMemoryFile}
                    onVcdChange={setInMemoryFile}
                    
                    // not needed anymore, since we're using `vcd` and `onVcdChange` as the temporary in_memory_database:
                    // vcdVersion={vcdVersion}
                    
                    // a new blank document definition:
                    vcdBlank={blankSampleVcd}
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
            {/* <p>parsed:</p>
            <pre>
                {JSON.stringify(inMemoryFile, undefined, 4)}
            </pre> */}
        </div>
    );
}
