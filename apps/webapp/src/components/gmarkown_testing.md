Creating a WebSocket messaging app in Java involves a server-side component (which handles connections and messages) and a client-side component (which connects and sends/receives messages).

We'll use the standard Java API for WebSockets (JSR 356, `javax.websocket`).

---

## 1. Server-Side (Java)

This will be a simple chat server. You'll need a Java EE/Jakarta EE application server like **Apache Tomcat** or **Eclipse Jetty** to deploy this.

**`ChatServerEndpoint.java`**

```java
import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

// This annotation defines the WebSocket endpoint URL.
// Clients will connect to ws://your_server_ip:port/chat
@ServerEndpoint("/chat")
public class ChatServerEndpoint {

    // A thread-safe set to store all connected client sessions.
    private static Set<Session> sessions = Collections.synchronizedSet(new HashSet<>());

    /**
     * Called when a new WebSocket connection is established.
     * @param session The session object for the new connection.
     */
    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        System.out.println("Client connected: " + session.getId());
        broadcast("New user joined: " + session.getId());
    }

    /**
     * Called when a message is received from a client.
     * @param message The text message received.
     * @param session The session from which the message originated.
     */
    @OnMessage
    public void onMessage(String message, Session session) {
        System.out.println("Message from " + session.getId() + ": " + message);
        // Broadcast the message to all connected clients
        broadcast("User " + session.getId() + ": " + message);
    }

    /**
     * Called when a WebSocket connection is closed.
     * @param session The session that was closed.
     * @param closeReason The reason for closure.
     */
    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        sessions.remove(session);
        System.out.println("Client disconnected: " + session.getId() + " - " + closeReason.getReasonPhrase());
        broadcast("User " + session.getId() + " left.");
    }

    /**
     * Called when an error occurs on a WebSocket connection.
     * @param session The session where the error occurred.
     * @param throwable The exception that caused the error.
     */
    @OnError
    public void onError(Session session, Throwable throwable) {
        System.err.println("Error on session " + session.getId() + ": " + throwable.getMessage());
        throwable.printStackTrace();
    }

    /**
     * Helper method to send a message to all connected clients.
     * @param message The message to broadcast.
     */
    private void broadcast(String message) {
        for (Session session : sessions) {
            try {
                // getBasicRemote() is synchronous, getAsyncRemote() is asynchronous
                session.getBasicRemote().sendText(message);
            } catch (IOException e) {
                System.err.println("Error broadcasting to " + session.getId() + ": " + e.getMessage());
                // Optionally remove the session if sending fails consistently
            }
        }
    }
}
```

---

## 2. Client-Side (Java)

This is a simple command-line Java client.

**`ChatClientEndpoint.java`**

```java
import javax.websocket.*;
import java.io.IOException;
import java.net.URI;
import java.util.Scanner;

// This annotation marks this class as a WebSocket client endpoint.
@ClientEndpoint
public class ChatClientEndpoint {

    private Session session; // The WebSocket session with the server

    /**
     * Called when the client successfully connects to the server.
     * @param session The session object for this connection.
     */
    @OnOpen
    public void onOpen(Session session) {
        this.session = session;
        System.out.println("Connected to chat server: " + session.getId());
    }

    /**
     * Called when a message is received from the server.
     * @param message The text message received.
     */
    @OnMessage
    public void onMessage(String message) {
        System.out.println("Received: " + message);
    }

    /**
     * Called when the connection to the server is closed.
     * @param session The session that was closed.
     * @param closeReason The reason for closure.
     */
    @OnClose
    public void onClose(Session session, CloseReason closeReason) {
        System.out.println("Disconnected from server: " + closeReason.getReasonPhrase());
    }

    /**
     * Called when an error occurs on the connection.
     * @param session The session where the error occurred.
     * @param throwable The exception that caused the error.
     */
    @OnError
    public void onError(Session session, Throwable throwable) {
        System.err.println("Error on client session: " + throwable.getMessage());
        throwable.printStackTrace();
    }

    /**
     * Sends a message to the server.
     * @param message The message to send.
     * @throws IOException If an I/O error occurs.
     */
    public void sendMessage(String message) throws IOException {
        if (session != null && session.isOpen()) {
            session.getBasicRemote().sendText(message);
        } else {
            System.err.println("Cannot send message: Not connected or session closed.");
        }
    }

    public static void main(String[] args) {
        // Get the WebSocket container instance
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        // The URI of the server WebSocket endpoint
        String uri = "ws://localhost:8080/chat"; // Adjust port if needed

        ChatClientEndpoint client = new ChatClientEndpoint();
        try {
            // Connect to the server
            container.connectToServer(client, URI.create(uri));

            // Allow user to type messages
            Scanner scanner = new Scanner(System.in);
            System.out.println("Type messages and press Enter. Type 'exit' to quit.");
            while (true) {
                System.out.print("> ");
                String message = scanner.nextLine();
                if ("exit".equalsIgnoreCase(message)) {
                    break;
                }
                client.sendMessage(message);
            }
        } catch (DeploymentException | IOException e) {
            System.err.println("Failed to connect or communicate with server: " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Close the session when done
            if (client.session != null && client.session.isOpen()) {
                try {
                    client.session.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

---

## 3. Client-Side (JavaScript/Browser)

This is a common way to interact with WebSockets from a web page.

**`index.html`**

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Chat Client</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #messages { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll; margin-bottom: 10px; }
        input[type="text"] { width: 70%; padding: 8px; }
        button { padding: 8px 15px; }
    </style>
</head>
<body>
    <h1>WebSocket Chat</h1>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Type your message...">
    <button onclick="sendMessage()">Send</button>

    <script>
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');

        // Create a new WebSocket connection
        // Adjust the URL to your server's IP and port if not localhost:8080
        const ws = new WebSocket("ws://localhost:8080/chat");

        // Event listener for when the connection is opened
        ws.onopen = function(event) {
            messagesDiv.innerHTML += "<p><em>Connected to chat server.</em></p>";
        };

        // Event listener for when a message is received from the server
        ws.onmessage = function(event) {
            messagesDiv.innerHTML += "<p>" + event.data + "</p>";
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
        };

        // Event listener for when the connection is closed
        ws.onclose = function(event) {
            messagesDiv.innerHTML += "<p><em>Disconnected from chat server.</em></p>";
        };

        // Event listener for errors
        ws.onerror = function(event) {
            messagesDiv.innerHTML += "<p style='color:red;'><em>Error: " + event.message + "</em></p>";
        };

        // Function to send a message to the server
        function sendMessage() {
            const message = messageInput.value;
            if (message) {
                ws.send(message); // Send the message
                messageInput.value = ''; // Clear the input field
            }
        }

        // Allow sending message by pressing Enter key
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
```

---

## How to Run and Execute

### 1. Server Setup (Apache Tomcat Example)

*   **Download Tomcat:** Get Apache Tomcat (e.g., version 9 or 10) from the official website.
*   **Maven Project:**
    *   Create a new Maven Web Application project.
    *   Add the `javax.websocket-api` dependency to your `pom.xml`:
        ```xml
        <dependencies>
            <dependency>
                <groupId>javax.websocket</groupId>
                <artifactId>javax.websocket-api</artifactId>
                <version>1.1</version> <!-- Or 1.0, 1.1, 1.2.1, etc. -->
                <scope>provided</scope> <!-- Provided by the server -->
            </dependency>
            <!-- If using Jakarta EE (Tomcat 10+), use jakarta.websocket-api -->
            <!--
            <dependency>
                <groupId>jakarta.websocket</groupId>
                <artifactId>jakarta.websocket-api</artifactId>
                <version>2.1.0</version>
                <scope>provided</scope>
            </dependency>
            -->
        </dependencies>
        <build>
            <finalName>websocket-chat</finalName> <!-- Name of your WAR file -->
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.8.1</version>
                    <configuration>
                        <source>1.8</source> <!-- Or higher, e.g., 11, 17 -->
                        <target>1.8</target>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-war-plugin</artifactId>
                    <version>3.3.2</version>
                </plugin>
            </plugins>
        </build>
        ```
    *   Place `ChatServerEndpoint.java` in `src/main/java/your/package/name/`.
    *   Build the project: `mvn clean package`. This will create a `websocket-chat.war` file in your `target` directory.
*   **Deploy:** Copy the `websocket-chat.war` file to Tomcat's `webapps` directory.
*   **Start Tomcat:** Run `startup.bat` (Windows) or `startup.sh` (Linux/macOS) from Tomcat's `bin` directory.

### 2. Java Client Setup

*   **Maven Project:**
    *   Create a new Maven Java project.
    *   Add the following dependencies to your `pom.xml`:
        ```xml
        <dependencies>
            <dependency>
                <groupId>javax.websocket</groupId>
                <artifactId>javax.websocket-api</artifactId>
                <version>1.1</version>
            </dependency>
            <!-- Tyrus is a reference implementation for JSR 356 client -->
            <dependency>
                <groupId>org.glassfish.tyrus</groupId>
                <artifactId>tyrus-standalone-client</artifactId>
                <version>1.17</version> <!-- Use a compatible version -->
            </dependency>
            <!-- If using Jakarta EE (Tomcat 10+), use jakarta.websocket-api and Tyrus Jakarta client -->
            <!--
            <dependency>
                <groupId>jakarta.websocket</groupId>
                <artifactId>jakarta.websocket-api</artifactId>
                <version>2.1.0</version>
            </dependency>
            <dependency>
                <groupId>org.glassfish.tyrus</groupId>
                <artifactId>tyrus-standalone-client-jdk</artifactId>
                <version>2.1.0</version>
            </dependency>
            -->
        </dependencies>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.8.1</version>
                    <configuration>
                        <source>1.8</source>
                        <target>1.8</target>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.codehaus.mojo</groupId>
                    <artifactId>exec-maven-plugin</artifactId>
                    <version>3.0.0</version>
                    <configuration>
                        <mainClass>ChatClientEndpoint</mainClass>
                    </configuration>
                </plugin>
            </plugins>
        </build>
        ```
    *   Place `ChatClientEndpoint.java` in `src/main/java/`.
*   **Run:**
    *   From your IDE (IntelliJ, Eclipse), right-click `ChatClientEndpoint.java` and "Run as Java Application".
    *   From the command line in the project root: `mvn exec:java`

### 3. JavaScript Client Setup

*   Save the `index.html` file to your computer.
*   Open the `index.html` file in any modern web browser (Chrome, Firefox, Edge).

---

## Execution Flow (Sending/Receiving Messages)

1.  **Start Tomcat:** The `ChatServerEndpoint` will be deployed and ready to accept connections on `ws://localhost:8080/chat` (or your server's IP/port).
2.  **Run Java Client:**
    *   The `main` method in `ChatClientEndpoint` will create a `WebSocketContainer` and attempt to `connectToServer`.
    *   The `@OnOpen` method in `ChatClientEndpoint` will be called, printing "Connected...".
    *   You can now type messages in your console. When you press Enter, `client.sendMessage()` will be called, which uses `session.getBasicRemote().sendText()` to send the message to the server.
    *   When the server receives a message, its `@OnMessage` method in `ChatServerEndpoint` is triggered. It then calls `broadcast()`, which iterates through all connected `sessions` and uses `session.getBasicRemote().sendText()` to send the message back to all clients (including the sender).
    *   When the Java client receives a message, its `@OnMessage` method is triggered, printing "Received: ...".
3.  **Open HTML Client:**
    *   The JavaScript `new WebSocket("ws://localhost:8080/chat")` will attempt to connect.
    *   The `ws.onopen` event will fire, updating the HTML.
    *   Type a message in the input field and click "Send" or press Enter. The `sendMessage()` function will call `ws.send(message)`.
    *   The server's `@OnMessage` will receive it and broadcast it.
    *   The JavaScript client's `ws.onmessage` event will fire, updating the `messagesDiv` with the received message.

You can run multiple Java clients and/or open multiple browser tabs with `index.html` to see them all communicate in real-time through the single Java WebSocket server.
