export type getThreadsResponse = {
    data: {
        id: string;
        title: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        messages: {
            id: string;
            threadId: string;
            status: string;
            model: string;
            role: string;
            provider: string;
            content: string | null;
            error: string | null;
            createdAt: string;
            updatedAt: string;
        }[];
    }[];
    meta: {
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    };
}