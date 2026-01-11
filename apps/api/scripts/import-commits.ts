/**
 * One-time script to import existing commits from GitHub
 *
 * Usage: pnpm tsx scripts/import-commits.ts
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { prisma } from '../src/lib/prisma'
import { getInstallationOctokit } from '../src/services/github/githubService'
import { processNewCommits } from '../src/services/github/prCommitLinkService'

async function importCommits() {
  console.log('Starting commit import...')

  // Get the linked repository
  const repository = await prisma.gitHubRepository.findFirst({
    where: {
      fullName: 'hydro13/kanbu',
    },
    include: {
      installation: true,
    },
  })

  if (!repository) {
    console.error('Repository hydro13/kanbu not found in database')
    process.exit(1)
  }

  if (!repository.installation) {
    console.error('No GitHub installation found for repository')
    process.exit(1)
  }

  console.log(`Found repository: ${repository.fullName} (id: ${repository.id})`)
  console.log(`Installation ID: ${repository.installation.installationId}`)

  // Get authenticated Octokit
  const octokit = await getInstallationOctokit(repository.installation.installationId)

  // Fetch commits from GitHub API (up to 100 per page, we'll paginate)
  console.log('Fetching commits from GitHub...')

  const allCommits: Array<{
    sha: string
    message: string
    authorName: string
    authorEmail: string
    authorLogin: string | null
    committedAt: Date
  }> = []

  let page = 1
  const perPage = 100

  while (true) {
    console.log(`Fetching page ${page}...`)

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: repository.owner,
      repo: repository.name,
      per_page: perPage,
      page,
    })

    if (commits.length === 0) {
      break
    }

    for (const commit of commits) {
      allCommits.push({
        sha: commit.sha,
        message: commit.commit.message,
        authorName: commit.commit.author?.name || 'Unknown',
        authorEmail: commit.commit.author?.email || 'unknown@example.com',
        authorLogin: commit.author?.login || null,
        committedAt: new Date(commit.commit.author?.date || new Date()),
      })
    }

    console.log(`  Fetched ${commits.length} commits (total: ${allCommits.length})`)

    if (commits.length < perPage) {
      break
    }

    page++
  }

  console.log(`\nTotal commits fetched: ${allCommits.length}`)

  // Process and store commits
  console.log('Storing commits in database...')

  const results = await processNewCommits(repository.id, allCommits)

  const newCommits = results.filter(r => !r.linked && r.method === 'none').length
  const linkedCommits = results.filter(r => r.linked).length

  console.log(`\nImport complete!`)
  console.log(`  Total processed: ${results.length}`)
  console.log(`  New commits: ${newCommits}`)
  console.log(`  Linked to tasks: ${linkedCommits}`)

  await prisma.$disconnect()
}

importCommits().catch((err) => {
  console.error('Error importing commits:', err)
  process.exit(1)
})
