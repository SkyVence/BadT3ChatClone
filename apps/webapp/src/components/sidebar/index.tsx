"use client"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { LogIn, LogOut, Plus, SearchIcon, SettingsIcon } from "lucide-react";
import { useAuth } from "../../context/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ThemeToggle } from "../theme-toggle";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { api } from "@/trpc/react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useCallback } from "react";
import { Skeleton } from "../ui/skeleton";
import type { Thread } from "@/types/threads";
import { useInfiniteQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from "next/navigation";
import { useStreamer } from "@/context/chat";
import { Button } from "../ui/button";

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

function formatPreview(content: string | null): string {
    if (!content) return "No messages yet";
    // Remove markdown and trim to reasonable length
    const cleaned = content.replace(/[#*`]/g, '').trim();
    return cleaned.length > 60 ? cleaned.substring(0, 60) + '...' : cleaned;
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
        return "Just now";
    } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
        return `${Math.floor(diffDays)}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

export function SidebarApp({ setOpen }: { setOpen: (open: boolean) => void }) {
    const { user, signOut, isLoading: isLoadingAuth } = useAuth();
    const pathname = usePathname();
    const { threadId: currentThreadId, optimisticMessage, startNewThread } = useStreamer();
    const loaderRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(false);

    const [offset, setOffset] = useState(0);
    const [allThreads, setAllThreads] = useState<Thread[]>([]);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const limit = 15;

    const {
        data,
        isLoading: isLoadingCurrentPage,
        isError,
        error,
    } = api.threads.getThreads.useQuery(
        { limit, offset },
        {
            staleTime: 1000 * 60 * 5,
            enabled: true
        }
    );

    // Update allThreads when new data arrives
    useEffect(() => {
        if (data?.data) {
            setAllThreads(prev => {
                if (offset === 0) {
                    // First page, replace all threads
                    return data.data;
                } else {
                    // Subsequent pages, append new threads
                    const newThreads = data.data.filter(
                        newThread => !prev.some(existingThread => existingThread.id === newThread.id)
                    );
                    return [...prev, ...newThreads];
                }
            });
            setIsFetchingNextPage(false);
        }
    }, [data, offset]);

    // Reset accumulated threads when user logs in/out or when a new thread is created
    useEffect(() => {
        setAllThreads([]);
        setOffset(0);
        setIsFetchingNextPage(false);
    }, [user?.id]);

    const hasNextPage = data ? offset + limit < data.meta.total : false;
    const isLoading = offset === 0 ? isLoadingCurrentPage : false; // Only show loading for first page

    const fetchNextPage = () => {
        if (hasNextPage && !isFetchingNextPage) {
            setIsFetchingNextPage(true);
            setOffset(prev => prev + limit);
        }
    };

    // Enhanced intersection observer for infinite scroll
    useEffect(() => {
        if (!loaderRef.current || !hasNextPage || isLoading || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    console.log('Loading next page of threads...');
                    fetchNextPage();
                }
            },
            {
                threshold: 0.1,
                rootMargin: '100px' // Start loading 100px before the element is visible
            }
        );

        observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [hasNextPage, isLoading, isFetchingNextPage]);

    // Monitor scroll position to determine if user is near bottom
    const handleScroll = useCallback((event: Event) => {
        const target = event.target as HTMLElement;
        const { scrollTop, scrollHeight, clientHeight } = target;
        const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setIsNearBottom(nearBottom);
    }, []);

    useEffect(() => {
        const scrollArea = scrollAreaRef.current;
        if (scrollArea) {
            const scrollViewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollViewport) {
                scrollViewport.addEventListener('scroll', handleScroll);
                return () => scrollViewport.removeEventListener('scroll', handleScroll);
            }
        }
    }, [handleScroll]);

    // Create optimistic thread for current conversation if it doesn't exist
    const optimisticThread = currentThreadId && optimisticMessage && !allThreads.find(t => t.id === currentThreadId) ? {
        id: currentThreadId,
        title: optimisticMessage.content?.substring(0, 50) + '...' || 'New conversation',
        userId: user?.id || '',
        createdAt: optimisticMessage.createdAt,
        updatedAt: optimisticMessage.updatedAt,
        messages: [optimisticMessage]
    } : null;

    // Merge optimistic thread with real threads and sort properly
    const threadsToDisplay = optimisticThread
        ? [optimisticThread, ...allThreads.filter(t => t.id !== currentThreadId)]
        : allThreads;

    // Sort threads by updated time (newest first)
    const sortedThreads = threadsToDisplay.sort((a: Thread, b: Thread) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Group threads by date category
    function groupThreadsByDate(threads: Thread[]) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        const last30 = new Date(today);
        last30.setDate(today.getDate() - 30);

        const groups: { [key: string]: Thread[] } = {
            'Today': [],
            'Yesterday': [],
            'Last 7 days': [],
            'Last 30 days': [],
            '30+ days': [],
        };

        threads.forEach(thread => {
            const updated = new Date(thread.updatedAt);
            if (
                updated >= today
            ) {
                groups['Today'].push(thread);
            } else if (
                updated.getDate() === yesterday.getDate() &&
                updated.getMonth() === yesterday.getMonth() &&
                updated.getFullYear() === yesterday.getFullYear()
            ) {
                groups['Yesterday'].push(thread);
            } else if (updated > last7) {
                groups['Last 7 days'].push(thread);
            } else if (updated > last30) {
                groups['Last 30 days'].push(thread);
            } else {
                groups['30+ days'].push(thread);
            }
        });
        return groups;
    }

    const groupedThreads = groupThreadsByDate(sortedThreads);
    const groupOrder = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', '30+ days'];

    const router = useRouter();

    return (
        <Sidebar variant="inset" className="flex flex-col h-full min-h-screen">
            <SidebarHeader>
                <div className="mt-9 relative">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="search" placeholder="Search..." className="border-none focus-visible:ring-0 pl-8" />
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Button onClick={() => {
                            startNewThread();
                            router.push("/");
                        }} className="w-full" variant="outline">
                            <Plus className="size-4" />
                            New Chat
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {/** Threads Infinite Scroll */}
                <SidebarGroup className="flex-1">
                    {/* Fixed header: label + action */}
                    <div className="flex items-center justify-between px-4 py-2 sticky top-0 z-10 backdrop-blur-lg rounded-md">
                        <SidebarGroupLabel className="text-md font-medium">Recent Chats</SidebarGroupLabel>
                    </div>
                    {/* Scrollable chat list */}
                    <SidebarGroupContent className="flex-1">
                        <ScrollArea className="h-full" ref={scrollAreaRef}>
                            <SidebarMenu>
                                {isLoadingAuth ? (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton>
                                            <Skeleton className="h-4 w-4" />
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ) : !user ? (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton>
                                            <span className="text-muted-foreground">No chats yet</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ) : (
                                    <Fragment>
                                        {groupOrder.map(group => (
                                            groupedThreads[group].length > 0 && (
                                                <Fragment key={group}>
                                                    <SidebarGroupLabel className="pt-2 tracking-wider opacity-90">
                                                        {group}
                                                    </SidebarGroupLabel>
                                                    {groupedThreads[group].map((thread: any) => {
                                                        const isActive = pathname === `/chat/${thread.id}`;
                                                        const latestMessage = thread.messages?.[0];
                                                        const preview = latestMessage ? formatPreview(latestMessage.content) : "New conversation";
                                                        const isOptimistic = thread.id === optimisticThread?.id;

                                                        return (
                                                            <SidebarMenuItem key={thread.id}>
                                                                <SidebarMenuButton asChild className={isActive ? "bg-accent" : ""}>
                                                                    <Link href={`/chat/${thread.id}`} className="flex flex-col items-start gap-1  h-auto">
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span className="truncate max-w-[200px] block font-medium text-sm">
                                                                                {thread.title}
                                                                            </span>
                                                                        </div>
                                                                    </Link>
                                                                </SidebarMenuButton>
                                                            </SidebarMenuItem>
                                                        )
                                                    })}
                                                </Fragment>
                                            )
                                        ))}

                                        {/* Loading skeletons - only show on initial load */}
                                        {isLoading && sortedThreads.length === 0 && (
                                            <Fragment>
                                                {Array.from({ length: 8 }).map((_, index) => (
                                                    <SidebarMenuItem key={`skeleton-${index}`}>
                                                        <SidebarMenuButton className="h-auto py-3">
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <div className="flex justify-between items-center">
                                                                    <Skeleton className="h-4 w-24" />
                                                                    <Skeleton className="h-3 w-12" />
                                                                </div>
                                                                <Skeleton className="h-3 w-36" />
                                                            </div>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                ))}
                                            </Fragment>
                                        )}

                                        {/* Empty state */}
                                        {sortedThreads.length === 0 && !isLoading && !isFetchingNextPage && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <span className="text-muted-foreground">No chats yet</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}

                                        {/* Error state */}
                                        {isError && !isLoading && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <span className="text-red-500">Error loading chats</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}

                                        {/* Infinite scroll loader */}
                                        {(hasNextPage || isFetchingNextPage) && (
                                            <SidebarMenuItem>
                                                <div ref={loaderRef} className="py-2">
                                                    {isFetchingNextPage ? (
                                                        <Fragment>
                                                            {Array.from({ length: 3 }).map((_, index) => (
                                                                <SidebarMenuButton key={`loading-${index}`} className="h-auto py-3 mb-1">
                                                                    <div className="flex flex-col gap-2 w-full">
                                                                        <div className="flex justify-between items-center">
                                                                            <Skeleton className="h-4 w-24" />
                                                                            <Skeleton className="h-3 w-12" />
                                                                        </div>
                                                                        <Skeleton className="h-3 w-36" />
                                                                    </div>
                                                                </SidebarMenuButton>
                                                            ))}
                                                        </Fragment>
                                                    ) : hasNextPage && isNearBottom ? (
                                                        <SidebarMenuButton onClick={() => fetchNextPage()}>
                                                            <span className="text-muted-foreground text-sm">Load more...</span>
                                                        </SidebarMenuButton>
                                                    ) : null}
                                                </div>
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

