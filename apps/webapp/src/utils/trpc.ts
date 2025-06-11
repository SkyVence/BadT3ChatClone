import { QueryCache, QueryClient } from '@tanstack/react-query';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@/routers';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            toast.error(error.message, {
                action: {
                    label: "retry",
                    onClick: () => {
                        queryClient.invalidateQueries();
                    },
                },
            });
        },
    }),
});

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

