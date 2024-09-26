'use client'

import Image from "next/image";
// import styles from "./page.module.css";
import { parseVcdFromFileContent, VcdViewer } from "@/components/vcd-viewer";
import vcdContent from '@/data/vcd'

export default function Home() {
    const vcdFile = parseVcdFromFileContent(vcdContent);
    return (
        <div>
            <VcdViewer vcd={vcdContent} />
            <hr />
            <p>parsed:</p>
            <pre>
                {JSON.stringify(vcdFile, undefined, 4)}
            </pre>
        </div>
    );
}
