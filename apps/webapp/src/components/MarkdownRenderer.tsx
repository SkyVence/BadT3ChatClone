"use client";
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { MarkdownCodeBlock } from "./markdown";

// Plugin to fix bolded code
export function remarkFixBoldedCode() {
    return (tree: any) => {
        visit(tree, "text", (node) => {
            const regex = /\*\*\`(.+?)\`\*\*/g;
            if (regex.test(node.value)) {
                node.value = node.value.replace(regex, "`$1`");
            }
        });
    };
}

// Plugin to add parent references
export function rehypeAddParents() {
    return (tree: any) => {
        visit(tree, (node: any, _index: any, parent: any) => {
            if (node && typeof node === "object") {
                (node as any).parent = parent;
            }
        });
    };
}

// MarkdownRenderer component
export default function MarkdownRenderer({ content }: { content: string }) {
    // Memoize markdown components
    const markdownComponents = useMemo(() => {
        const CodeRenderer = ({ className = "", children, node, ...props }: any) => {
            // Detect block code: the direct parent must be a <pre> element
            const isBlock = typeof node?.parent?.tagName === "string" && node.parent.tagName.toLowerCase() === "pre";
            if (isBlock) return null;
            const text = Array.isArray(children) ? children.join("") : children;
            return (
                <code className="bg-muted px-1 py-0.5 rounded-md font-mono text-blue-400 text-sm" {...props}>
                    {text}
                </code>
            );
        };
        const PreRenderer = ({ children, node, ...props }: any) => {
            let languageClass = "";
            let codeString = "";
            if (node && Array.isArray(node.children)) {
                const codeNode: any = node.children.find((n: any) => n.tagName === "code") || node.children[0];
                if (codeNode) {
                    languageClass = (codeNode.properties?.className ?? []).join(" ");
                    if (Array.isArray(codeNode.children) && codeNode.children[0]?.value) {
                        codeString = codeNode.children.map((c: any) => c.value || "").join("");
                    }
                }
            }
            if (!codeString && Array.isArray(children) && children.length) {
                const codeElem: any = children[0];
                languageClass = codeElem?.props?.className || languageClass;
                const raw = codeElem?.props?.children;
                codeString = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.join("") : "";
            }
            return (
                <MarkdownCodeBlock className={languageClass} {...props}>
                    {codeString}
                </MarkdownCodeBlock>
            );
        };

        return {
            code: CodeRenderer,
            pre: PreRenderer,
        } as const;
    }, []);

    const allComponents = {
        ...markdownComponents,
        h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mt-4 mb-2" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
        h4: ({ node, ...props }: any) => <h4 className="text-base font-bold mt-4 mb-2" {...props} />,
        h5: ({ node, ...props }: any) => <h5 className="text-sm font-bold mt-4 mb-2" {...props} />,
        h6: ({ node, ...props }: any) => <h6 className="text-xs font-bold mt-4 mb-2" {...props} />,
        p: ({ node, ...props }: any) => <p className="leading-relaxed mt-2 mb-2" {...props} />,
        ul: ({ node, ...props }: any) => <ul className="list-disc list-inside indent-4 mt-2 mb-2" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside indent-4 mt-2 mb-2" {...props} />,
        li: ({ node, ...props }: any) => <li className="leading-relaxed mt-2 mb-2" {...props} />,
        blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-gray-300 pl-4 mt-2 mb-2" {...props} />,
        a: ({ node, ...props }: any) => <a className="text-blue-500 mt-2 mb-2" {...props} />,
        img: ({ node, ...props }: any) => <img className="w-full mt-2 mb-2" {...props} />,
        hr: ({ node, ...props }: any) => <hr className="my-4 mt-10 mb-10" {...props} />,
        table: ({ node, ...props }: any) => <table className="w-full mt-2 mb-2" {...props} />,
        tr: ({ node, ...props }: any) => <tr className="border-b mt-2 mb-2" {...props} />,
        th: ({ node, ...props }: any) => <th className="px-4 py-2 mt-2 mb-2" {...props} />,
        td: ({ node, ...props }: any) => <td className="px-4 py-2 mt-2 mb-2" {...props} />,
        em: ({ node, ...props }: any) => <em className="italic mt-2 mb-2" {...props} />,
        strong: ({ node, ...props }: any) => <strong className="font-bold mt-2 mb-2" {...props} />,
        del: ({ node, ...props }: any) => <del className="line-through mt-2 mb-2" {...props} />,
        ins: ({ node, ...props }: any) => <ins className="underline mt-2 mb-2" {...props} />,
        sub: ({ node, ...props }: any) => <sub className="text-xs mt-2 mb-2" {...props} />,
        sup: ({ node, ...props }: any) => <sup className="text-xs mt-2 mb-2" {...props} />,
        kbd: ({ node, ...props }: any) => <kbd className="bg-muted px-1 py-0.5 rounded-md font-mono text-blue-400 text-sm mt-2 mb-2" {...props} />,
    }

    return (
        <ReactMarkdown
            components={allComponents}
            remarkPlugins={[remarkGfm, remarkFixBoldedCode]}
            rehypePlugins={[rehypeAddParents]}
        >
            {content}
        </ReactMarkdown>
    );
} 