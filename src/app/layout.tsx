'use client'

// styles:
import {
    StylesCSR,
} from './StylesCSR' // client_side_rendering CSS (required)
import {
    StylesSSR,
} from './StylesSSR' // server_side_rendering CSS (optional)

import localFont from "next/font/local";
// import "./globals.css";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <StylesCSR />
                <StylesSSR />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                {children}
            </body>
        </html>
    );
}
