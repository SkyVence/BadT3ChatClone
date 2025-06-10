import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { GithubIcon, Loader2 } from "lucide-react";
import { useAuth } from "../provider/context";
import { Fragment, useState } from "react";

export function SignInDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { signIn } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>To continue, you need to sign in</DialogTitle>
                    <DialogDescription>We currently only support Github authentication</DialogDescription>
                </DialogHeader>
                <Button className="w-full" onClick={() => { setIsLoading(true); signIn.social({ provider: "github" }) }} disabled={isLoading}>
                    {isLoading ? (
                        <Fragment>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Signing in...</span>
                        </Fragment>
                    ) : (
                        <>
                            <GithubIcon className="size-4" />
                            <span>Continue with Github</span>
                        </>
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    )
}