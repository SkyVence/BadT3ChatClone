# 🚀 fast-chatapp

My attempt to build a t3chat clone for the t3 cloneathon.
I used v0 for the ui with some small touch up on something. Nowhere near a good ui but you know...
I learned a bit about SSE so i tried my hand at creating at making resumeable streams. It's working but sometimes it takes time to connect.

Currently support only bring your own key, those keys are stored in a db and encrypted until used to create the actual ai sdk client for the provider. I plan on making local-storage api key support maybe before the end of the challenge.

---

## ✨ Features

- **TypeScript** – End-to-end type safety
- **Next.js** – Full-stack React framework
- **tRPC** – Type-safe APIs, no codegen
- **TailwindCSS** – Rapid UI development
- **shadcn/ui** – Reusable UI components
- **Drizzle ORM** – TypeScript-first database access
- **PostgreSQL** – Reliable, scalable database
- **Turborepo** – Monorepo build system - Only using it because i can run script in one terminal window
- **BetterAuth** - Authentication library - Social provider Github already setup

---

## AI Provider

- **OpenAI** - All text model are supported for now - Do not try gpt-image-1 since i don't support image currently - No vision support or text upload
- **Google** - All text model are supported for now - No vision, text upload, ground search
- **Anthropic** - No vision, text upload

---

## 🛠️ Work in Progress

- 🖍️ **Text Highlighting** – Highlight and annotate messages in chat
- 📎 **File Upload** – Share files directly in chat conversations
- 🚧 **More features coming soon!**

---

## 🏗️ Project Structure

```text
fast-chatapp/
├── apps/
│   └── server/      # Backend API (Next.js, tRPC)
```

---

## 📝 Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure your database**
   - Set up PostgreSQL
   - Update `apps/server/.env` with your DB credentials
3. **Apply the schema**
   ```bash
   pnpm db:push
   ```
4. **Run the development server**
   ```bash
   pnpm dev
   ```

> The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 📦 Scripts

| Script             | Description                |
| ------------------ | -------------------------- |
| `pnpm dev`         | Start all apps in dev mode |
| `pnpm build`       | Build all apps             |
| `pnpm dev:web`     | Start only the web app     |
| `pnpm dev:server`  | Start only the server      |
| `pnpm check-types` | Type check                 |
| `pnpm db:push`     | Push schema to DB          |
| `pnpm db:studio`   | Open DB studio UI          |

---

## 🤝 Contributing

Pull requests and issues are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE)
