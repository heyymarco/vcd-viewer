'use client'

import { useState } from "react";
import { parseVcdFromFileContent, VcdViewer } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'
import { useEvent } from "@reusable-ui/core";
import { type Vcd } from "@/models";



export default function Home() {
    const [vcd, setVcd] = useState<Vcd|null>(() => parseVcdFromFileContent(vcdContent));
    const [vcdVersion, setVcdVersion] = useState<any>(() => new Date());
    const handleFileOpen = useEvent<React.ChangeEventHandler<HTMLInputElement>>(async (event) => {
        const file : File|null = event.currentTarget.files?.[0] ?? null;
        if (!file) return;
        
        const fileContent = await file.text();
        const newVcd = parseVcdFromFileContent(fileContent);
        setVcd(newVcd);
        setVcdVersion(new Date(file.lastModified));
    });
    
    
    
    return (
        <div>
            <div style={{ display: 'grid', height: '70vh' }}>
                <VcdViewer vcd={vcd} vcdVersion={vcdVersion} />
            </div>
            <hr />
            <p>
                Open a *.vcd file from your computer:
            </p>
            <input type='file' accept='.vcd' onChange={handleFileOpen} multiple={false} />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcd, undefined, 4)}
            </pre>
        </div>
    );
}
