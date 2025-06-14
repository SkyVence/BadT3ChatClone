"use client"
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CheckIcon, DownloadIcon } from "lucide-react";
import { CopyIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type CodeProps = {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
};

export function MarkdownCodeBlock({ node, inline, className: clsNameProp, children, ...props }: CodeProps) {
    // Determine the raw code string and language regardless of whether this
    // component is used as the `code` renderer or as the `pre` renderer.

    let rawCode = "";
    let languageClass = clsNameProp || "";

    if (typeof children === "string") {
        rawCode = children;
    } else if (Array.isArray(children) && children.length === 1 && typeof children[0] === "string") {
        rawCode = children[0];
    } else if (Array.isArray(children) && children.length === 1 && (children[0] as any)?.props) {
        // The typical case when this component replaces a <pre> element – the
        // actual <code> element is the only child of <pre>
        const codeElem = children[0] as any;
        rawCode = typeof codeElem.props.children === "string"
            ? codeElem.props.children
            : Array.isArray(codeElem.props.children)
                ? codeElem.props.children.join("")
                : String(codeElem.props.children);
        languageClass = codeElem.props.className || languageClass;
    } else {
        rawCode = String(children);
    }

    const codeString = rawCode.replace(/\n$/, "");

    const match = /language-(\w+)/.exec(languageClass || "");
    const language = match ? match[1] : "plaintext";

    // const isSingleLineCodeBlock = !inline && codeString.includes('/') && !codeString.includes('\n');

    if (inline) {
        return <code className="bg-muted p-1 rounded-md text-sm font-mono text-blue-400" {...props}>{codeString}</code>;
    }

    // State for copy/download
    const [copied, setCopied] = useState(false);
    const [filename, setFilename] = useState(`${language}.txt`);
    const [isOpenDialog, setIsOpenDialog] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    function downloadCode(filename: string) {
        const blob = new Blob([codeString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setIsOpenDialog(false);
    }

    return (
        <div className="relative my-2 group">
            <div className="flex items-center justify-between bg-muted px-4 py-1 rounded-t-md">
                <span className="text-xs font-medium text-muted-foreground">{language}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyToClipboard}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/20"
                        aria-label="Copy code"
                    >
                        {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="size-7 border-none">
                                <DownloadIcon className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Code Snippet to file</DialogTitle>
                                <DialogDescription>
                                    Save the code snippet to a file.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter a filename"
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-row gap-2 justify-end">
                                <Button type="button" onClick={() => downloadCode(filename)}>
                                    Save
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setFilename('');
                                    setIsOpenDialog(false);
                                }}>
                                    Cancel
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <SyntaxHighlighter
                language={language}
                PreTag="pre"
                style={a11yDark}
                customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    );
}
