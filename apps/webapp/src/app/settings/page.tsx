"use client"
import { useAuth } from "@/context/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LogOutIcon, TrashIcon, PlusIcon, KeyIcon, SunIcon, MoonIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "@/trpc/react"
import { useTheme } from "next-themes"

type ApiKey = {
    id: string;
    provider: "anthropic" | "openai" | "google";
    key: string;
    createdAt?: string;
    updatedAt?: string;
}

export default function SettingsPage() {
    const { user, signOut, deleteUser } = useAuth()
    const router = useRouter()
    const [selectedKeys, setSelectedKeys] = useState<string[]>([])
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()
    const queryClient = useQueryClient()

    useEffect(() => {
        setMounted(true)
    }, [])

    const [newKeyForm, setNewKeyForm] = useState({
        provider: "",
        key: ""
    })

    const apiKeys = api.settings.getApiKeys.useQuery()

    const handleDeleteAccount = () => {
        deleteUser();
        router.push("/");
    }

    const handleSelectKey = (keyId: string, checked: boolean) => {
        if (checked) {
            setSelectedKeys([...selectedKeys, keyId])
        } else {
            setSelectedKeys(selectedKeys.filter(id => id !== keyId))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedKeys((apiKeys.data ?? []).map((key: ApiKey) => key.id))
        } else {
            setSelectedKeys([])
        }
    }

    const createKeyMutation = api.settings.createApiKey.useMutation({
        onSuccess: () => {
            setIsCreateDialogOpen(false)
            setNewKeyForm({ provider: "", key: "" })
            // Refetch API keys after successful creation
            apiKeys.refetch()
        },
        onError: (error) => {
            console.error("Failed to create API key:", error)
        }
    })

    const deleteKeyMutation = api.settings.deleteApiKey.useMutation({
        onSuccess: () => {
            // Refetch API keys after successful deletion
            apiKeys.refetch()
        },
        onError: (error) => {
            console.error("Failed to delete API key:", error)
        }
    })

    const handleCreateKey = () => {
        createKeyMutation.mutate({
            provider: newKeyForm.provider as "anthropic" | "openai" | "google",
            key: newKeyForm.key
        })
    }

    const handleDeleteSelected = async () => {
        if (selectedKeys.length === 0) return
        try {
            await Promise.all(
                selectedKeys.map(keyId =>
                    deleteKeyMutation.mutateAsync({ id: keyId })
                )
            )
            setSelectedKeys([])
        } catch (error) {
            console.error("Failed to delete API keys:", error)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Top Navigation */}
                <div className="flex justify-between items-center">
                    <Button variant="outline" className="hover:scale-105 transition-transform" onClick={() => router.push("/")}>
                        Go back to chat
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" className="hover:scale-105 transition-transform" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            {mounted ? (theme === "dark" ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />) : <div className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" className="hover:scale-105 transition-transform text-red-500" onClick={() => {
                            signOut();
                            router.push("/");
                        }}>
                            <LogOutIcon className="w-4 h-4" />
                            <span>Logout</span>
                        </Button>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Manage your account and preferences</p>
                </div>

                {/* Profile and Settings */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Profile Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-center">Profile</h2>
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="size-32 ring-4 ring-primary/10 shadow-xl">
                                <AvatarImage src={user?.image || ""} alt={user?.email || ""} />
                                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center space-y-1">
                                <p className="font-medium text-lg">{user?.name}</p>
                                <p className="font-medium text-lg">{user?.email}</p>
                                <p className="text-sm text-muted-foreground">
                                    {user?.emailVerified ? "Verified" : "Unverified"}
                                </p>
                                <p className="text-sm text-muted-foreground">Account Settings</p>
                            </div>
                        </div>
                    </div>

                    {/* Settings Tabs Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-center">Configuration</h2>
                        <div className="flex justify-center">
                            <Tabs defaultValue="account" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-6">
                                    <TabsTrigger value="account" className="text-xs sm:text-sm">
                                        Account
                                    </TabsTrigger>
                                    <TabsTrigger value="api-keys" className="text-xs sm:text-sm">
                                        API Keys
                                    </TabsTrigger>
                                    <TabsTrigger value="attachements" className="text-xs sm:text-sm">
                                        Attachments
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="account" className="space-y-4">
                                    <div className="flex flex-col gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            Delete your account and all your data.
                                        </span>
                                        <div className="text-destructive">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" className="w-full">
                                                        <TrashIcon className="w-4 h-4" />
                                                        <span>Delete Account</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete your account
                                                            and remove all your data from our servers, including:
                                                        </AlertDialogDescription>
                                                        <div className="text-sm text-muted-foreground">
                                                            <ul className="list-disc list-inside mt-2 space-y-1">
                                                                <li>All your chat conversations</li>
                                                                <li>Your profile information</li>
                                                                <li>Any saved preferences</li>
                                                                <li>API keys and configurations</li>
                                                            </ul>
                                                        </div>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={handleDeleteAccount}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Yes, delete my account
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="api-keys" className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-medium">API Keys</h3>
                                            <div className="flex gap-2">
                                                {selectedKeys.length > 0 && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={handleDeleteSelected}
                                                        disabled={deleteKeyMutation.isPending}
                                                    >
                                                        <TrashIcon className="w-4 h-4 mr-2" />
                                                        {deleteKeyMutation.isPending ? 'Deleting...' : `Delete Selected (${selectedKeys.length})`}
                                                    </Button>
                                                )}
                                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm">
                                                            <PlusIcon className="w-4 h-4 mr-2" />
                                                            Add API Key
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        <DialogHeader>
                                                            <DialogTitle>Add New API Key</DialogTitle>
                                                            <DialogDescription>
                                                                Add a new API key for your preferred AI provider.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="provider">Provider</Label>
                                                                <Select
                                                                    value={newKeyForm.provider}
                                                                    onValueChange={(value) => setNewKeyForm({ ...newKeyForm, provider: value })}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select a provider" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="openai">OpenAI</SelectItem>
                                                                        <SelectItem value="anthropic">Anthropic</SelectItem>
                                                                        <SelectItem value="google">Google</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="api-key">API Key</Label>
                                                                <Input
                                                                    id="api-key"
                                                                    type="password"
                                                                    placeholder="Enter your API key"
                                                                    value={newKeyForm.key}
                                                                    onChange={(e) => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                type="submit"
                                                                onClick={handleCreateKey}
                                                                disabled={!newKeyForm.provider || !newKeyForm.key || createKeyMutation.isPending}
                                                            >
                                                                <KeyIcon className="w-4 h-4 mr-2" />
                                                                {createKeyMutation.isPending ? 'Adding...' : 'Add Key'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>

                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-12">
                                                            <Checkbox
                                                                checked={selectedKeys.length === (apiKeys.data?.length || 0) && (apiKeys.data?.length || 0) > 0}
                                                                onCheckedChange={handleSelectAll}
                                                                aria-label="Select all"
                                                            />
                                                        </TableHead>
                                                        <TableHead>Provider</TableHead>
                                                        <TableHead>API Key</TableHead>
                                                        <TableHead>Created</TableHead>
                                                        <TableHead>Last Used</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {!apiKeys.data || (apiKeys.data as ApiKey[]).length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                                No API keys found. Add your first API key to get started.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        (apiKeys.data as ApiKey[]).map((apiKey: ApiKey) => (
                                                            <TableRow key={apiKey.id}>
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={selectedKeys.includes(apiKey.id)}
                                                                        onCheckedChange={(checked) => handleSelectKey(apiKey.id, checked as boolean)}
                                                                        aria-label={`Select ${apiKey.provider} key`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium">{apiKey.provider}</TableCell>
                                                                <TableCell className="font-mono text-sm">{apiKey.key ? `${apiKey.key.slice(0, 9)}••••••••` : 'N/A'}</TableCell>
                                                                <TableCell className="text-muted-foreground">{apiKey.createdAt}</TableCell>
                                                                <TableCell className="text-muted-foreground">{apiKey.updatedAt || 'Never'}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="attachements" className="space-y-4">
                                    <div className="text-center text-muted-foreground">
                                        Attachment settings will appear here
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}