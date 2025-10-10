# Example Snippets

Here are some example snippets to get you started! Copy and paste these into your SnippetVault.

## Python Examples

### Quick Sort Algorithm
**Language:** Python
**Tags:** algorithm, sorting, python
**Description:** Classic quicksort implementation

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Usage
numbers = [3, 6, 8, 10, 1, 2, 1]
sorted_numbers = quicksort(numbers)
print(sorted_numbers)
```

### REST API Request with Error Handling
**Language:** Python
**Tags:** api, requests, error-handling
**Description:** Make HTTP requests with proper error handling

```python
import requests
from requests.exceptions import RequestException

def fetch_data(url, params=None):
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except RequestException as e:
        print(f"Error fetching data: {e}")
        return None

# Usage
data = fetch_data("https://api.example.com/data")
if data:
    print(f"Retrieved {len(data)} items")
```

## JavaScript Examples

### Debounce Function
**Language:** JavaScript
**Tags:** utility, performance, javascript
**Description:** Debounce function to limit function calls

```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Usage
const searchHandler = debounce((query) => {
    console.log('Searching for:', query);
}, 300);

searchInput.addEventListener('input', (e) => {
    searchHandler(e.target.value);
});
```

### Fetch with Retry
**Language:** JavaScript
**Tags:** api, fetch, retry, error-handling
**Description:** Fetch data with automatic retry on failure

```javascript
async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Usage
try {
    const data = await fetchWithRetry('https://api.example.com/data');
    console.log(data);
} catch (error) {
    console.error('Failed after retries:', error);
}
```

## Rust Examples

### Read File with Error Handling
**Language:** Rust
**Tags:** rust, file-io, error-handling
**Description:** Read a file with proper error handling

```rust
use std::fs;
use std::io;

fn read_file_contents(path: &str) -> io::Result<String> {
    fs::read_to_string(path)
}

fn main() {
    match read_file_contents("example.txt") {
        Ok(contents) => println!("File contents: {}", contents),
        Err(e) => eprintln!("Error reading file: {}", e),
    }
}
```

### Simple HTTP Server
**Language:** Rust
**Tags:** rust, http, server, async
**Description:** Basic HTTP server using tokio and warp

```rust
use warp::Filter;

#[tokio::main]
async fn main() {
    let hello = warp::path!("hello" / String)
        .map(|name| format!("Hello, {}!", name));

    let health = warp::path!("health")
        .map(|| "OK");

    let routes = hello.or(health);

    warp::serve(routes)
        .run(([127, 0, 0, 1], 3030))
        .await;
}
```

## SQL Examples

### Complex Join Query
**Language:** SQL
**Tags:** sql, join, query
**Description:** Join multiple tables with aggregation

```sql
SELECT 
    u.id,
    u.username,
    COUNT(p.id) as post_count,
    COUNT(DISTINCT c.id) as comment_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON u.id = c.user_id
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.username
HAVING post_count > 0
ORDER BY post_count DESC
LIMIT 10;
```

### Create Index for Performance
**Language:** SQL
**Tags:** sql, index, performance
**Description:** Create indexes for faster queries

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

-- Unique index
CREATE UNIQUE INDEX idx_users_username ON users(username);

-- Partial index (PostgreSQL)
CREATE INDEX idx_active_users ON users(email) WHERE active = true;
```

## Shell/Bash Examples

### Backup Script
**Language:** Bash
**Tags:** bash, backup, automation
**Description:** Simple backup script with timestamp

```bash
#!/bin/bash

# Configuration
SOURCE_DIR="/home/user/documents"
BACKUP_DIR="/backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_$TIMESTAMP.tar.gz"

# Create backup
echo "Creating backup..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" "$SOURCE_DIR"

# Check if successful
if [ $? -eq 0 ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    
    # Delete backups older than 7 days
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
    echo "Old backups cleaned up"
else
    echo "Backup failed!"
    exit 1
fi
```

## TypeScript Examples

### Generic API Client
**Language:** TypeScript
**Tags:** typescript, api, generic, class
**Description:** Type-safe API client with generics

```typescript
interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

class ApiClient {
    constructor(private baseUrl: string) {}

    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result: ApiResponse<T> = await response.json();
        return result.data;
    }

    async post<T, D>(endpoint: string, data: D): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result: ApiResponse<T> = await response.json();
        return result.data;
    }
}

// Usage
interface User {
    id: number;
    name: string;
    email: string;
}

const client = new ApiClient('https://api.example.com');
const user = await client.get<User>('/users/1');
console.log(user.name);
```

## Go Examples

### Concurrent Worker Pool
**Language:** Go
**Tags:** go, concurrency, goroutine, worker-pool
**Description:** Worker pool pattern for concurrent processing

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        results <- job * 2
    }
}

func main() {
    const numWorkers = 3
    const numJobs = 10

    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)
    var wg sync.WaitGroup

    // Start workers
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs)

    // Wait and close results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    for result := range results {
        fmt.Println("Result:", result)
    }
}
```

---

## Tips for Creating Good Snippets

1. **Use descriptive titles**: "REST API with retry logic" vs "api call"
2. **Add relevant tags**: Makes searching easier
3. **Include context in description**: Why/when to use this snippet
4. **Add usage examples**: Show how to use the code
5. **Keep it focused**: One concept per snippet
6. **Add error handling**: Show best practices
7. **Document parameters**: Add comments for complex code

## Importing These Examples

Copy any example above and:
1. Click "New Snippet" in SnippetVault
2. Paste the title
3. Select the language
4. Add the tags (comma-separated)
5. Paste the description
6. Paste the code
7. Click "Save"

Now you can search for them using keywords or natural language!

