# API Key Setup

## Your API Key
Your API key has been configured: `01118774-182f-4410-bc3a-509af152d153`

## Setup Instructions

1. **Create a `.env.local` file** in the root directory (same level as `package.json`)

2. **Add your API key**:
```bash
NBA_API_KEY=01118774-182f-4410-bc3a-509af152d153
```

3. **Restart your dev server** after creating the file:
```bash
npm run dev
```

## File Structure
```
sports-tracker/
├── .env.local          # ← Create this file (already in .gitignore)
├── .env.example        # Template file
├── package.json
└── ...
```

## Security Note
- `.env.local` is already in `.gitignore` - your API key won't be committed to git
- Never share your API key publicly
- The API key is only used server-side through Next.js API routes

## Testing the API
Once set up, you can test the endpoints:
- `http://localhost:3000/api/nba/players?teamId=14` - Get Lakers players
- `http://localhost:3000/api/nba/stats?playerId=237` - Get player stats
- `http://localhost:3000/api/nba/games?teamId=14` - Get Lakers games

## Troubleshooting
If API calls fail:
1. Make sure `.env.local` exists in the root directory
2. Restart the dev server after creating/updating `.env.local`
3. Check that the API key format matches your API provider's requirements
4. Some APIs may require different authentication methods (headers vs query params)
