"use client"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { LogIn, LogOut, Plus, SearchIcon, SettingsIcon } from "lucide-react";
import { useAuth } from "../../context/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ThemeToggle } from "../theme-toggle";
import { ScrollArea } from "../ui/scroll-area";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import type { getThreadsResponse } from "@/types/threads";
import { useInfiniteQuery } from '@tanstack/react-query';
import { usePathname } from "next/navigation";

export function ChatMessages({ messages }: { messages: string[] }) {
    return (
        <div className="flex flex-col gap-2 p-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                    No messages yet. Start a conversation!
                </div>
            ) : (
                messages.map((message, index) => (
                    <div key={index} className="bg-muted/50 rounded-lg p-3 text-sm">
                        {message}
                    </div>
                ))
            )}
        </div>
    );
}


export function SidebarApp({ setOpen }: { setOpen: (open: boolean) => void }) {
    const [hasMore, setHasMore] = useState(true);
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    const loaderRef = useRef<HTMLDivElement>(null);
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['threads', { limit: 15 }],
        queryFn: ({ pageParam = 0 }) =>
            trpc.threads.getThreads.query({ limit: 15, offset: pageParam }),
        getNextPageParam: (lastPage, allPages) => {
            // Calculate next offset
            if (lastPage.meta.totalPages > allPages.length) {
                return allPages.length * 15;
            }
            return undefined;
        },
        initialPageParam: 0,
    });
    const threads = data?.pages.flatMap(page => page.data) ?? [];
    console.log(threads)

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!loaderRef.current || !hasNextPage || isLoading || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {

                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [fetchNextPage, hasNextPage, isLoading, isFetchingNextPage]);


    return (
        <Sidebar variant="inset" className="flex flex-col h-full min-h-screen">
            <SidebarHeader>
                <div className="mt-9 relative">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="search" placeholder="Search..." className="border-none focus-visible:ring-0 pl-8" />
                </div>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Projects
                    </SidebarGroupLabel>
                    <SidebarGroupAction asChild>
                        <Link href="/projects/new">
                            <Plus className="size-4" />
                        </Link>
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Project 1</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>See more...</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarHeader>
            <SidebarContent>
                {/** Threads Infinite Scroll */}
                <SidebarGroup className="flex-1">
                    <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
                    <SidebarGroupAction asChild>
                        <Link href="/">
                            <Plus className="size-4" />
                        </Link>
                    </SidebarGroupAction>
                    <SidebarGroupContent className="flex-1">
                        <ScrollArea className="h-full">
                            <SidebarMenu>
                                {!user ? (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton>
                                            <span className="text-muted-foreground">No chats yet</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ) : (
                                    <Fragment>
                                        {threads.map((thread: getThreadsResponse["data"][0]) => {
                                            return (
                                                <SidebarMenuItem key={thread.id}>
                                                    <SidebarMenuButton asChild>
                                                        <Link href={`/chat?threadId=${thread.id}`}>
                                                            <span className="truncate max-w-[210px] block">{thread.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )
                                        })
                                        }

                                        {isLoading && (
                                            <Fragment>
                                                {Array.from({ length: 15 }).map((_, index) => (
                                                    <SidebarMenuItem key={index}>
                                                        <SidebarMenuButton>
                                                            <Skeleton className="w-full h-10" />
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                ))}
                                            </Fragment>
                                        )}

                                        {threads.length === 0 && !isLoading && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <span className="text-muted-foreground">No chats yet</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}

                                        {isError && !isLoading && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <span className="text-red-500">Error loading chats</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}
                                    </Fragment>
                                )}
                            </SidebarMenu>
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg">
                                <Avatar className="size-8 ">
                                    <AvatarImage src={user.image || ""} />
                                    <AvatarFallback>
                                        {user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span>{user.name}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end">
                            <DropdownMenuLabel className="">
                                <div className="flex items-center gap-2">
                                    <Avatar className="size-8">
                                        <AvatarImage src={user.image || ""} />
                                        <AvatarFallback>
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">
                                        <SettingsIcon className="size-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <ThemeToggle />
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => { signOut() }}>
                                <LogOut className="size-4" />
                                <span className="text-red-500">Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <SidebarMenuButton size="lg" onClick={() => { setOpen(true) }} className="cursor-pointer">
                        <LogIn className="size-4" />
                        <span>Login</span>
                    </SidebarMenuButton>
                )}
            </SidebarFooter>
        </Sidebar >
    )
}

