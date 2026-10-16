export interface GlossaryItem {
  term: string
  meaning: string
}

export interface StructureItem {
  name: string
  type: "file" | "dir"
  role: string
  description: string
  glossaryTerm?: GlossaryItem
}

export interface RepoBriefingData {
  owner: string
  repo: string
  fullName: string
  url: string
  isSample: boolean
  description: string | null
  primaryLanguage: string | null
  license: string | null
  stars: number
  forks: number
  defaultBranch: string
  visibility: string
  whatItDoes: string
  problemSolved: string
  targetAudience: string
  repositoryOverview: string
  structureMap: StructureItem[]
}

export function parseGitHubUrl(input: string): { owner: string; repo: string; fullUrl: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Match full URL: https://github.com/owner/repo or http://github.com/owner/repo
  const urlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\/|\.git)?$/i
  const match = trimmed.match(urlPattern)
  if (match) {
    const owner = match[1]
    const repo = match[2].replace(/\.git$/, "")
    return {
      owner,
      repo,
      fullUrl: `https://github.com/${owner}/${repo}`,
    }
  }

  // Match owner/repo
  const shortPattern = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/
  const shortMatch = trimmed.match(shortPattern)
  if (shortMatch) {
    const owner = shortMatch[1]
    const repo = shortMatch[2]
    return {
      owner,
      repo,
      fullUrl: `https://github.com/${owner}/${repo}`,
    }
  }

  return null
}

const SAMPLE_CASE_VERCEL_MS: RepoBriefingData = {
  owner: "vercel",
  repo: "ms",
  fullName: "vercel/ms",
  url: "https://github.com/vercel/ms",
  isSample: true,
  description: "Tiny millisecond conversion utility for Node.js and modern browsers.",
  primaryLanguage: "JavaScript",
  license: "MIT License",
  stars: 5200,
  forks: 310,
  defaultBranch: "master",
  visibility: "public",
  whatItDoes:
    "Converts human-readable duration phrases (like '2 days', '15m', or '1.5h') into exact millisecond numbers (e.g. 172800000, 900000), and formats milliseconds back into friendly shorthand strings.",
  problemSolved:
    "Computers measure time in milliseconds, but developers and users think in hours, days, and seconds. Writing manual mathematical conversions in every project is repetitive and leads to bugs.",
  targetAudience:
    "Web developers, backend API builders, and frameworks needing reliable duration calculations for cache timeouts, session lifetimes, and rate limits.",
  repositoryOverview:
    "A clean, minimalist JavaScript micro-utility consisting of an entry function, lightweight helper imports, package manifests, and unit tests.",
  structureMap: [
    {
      name: "source/index.js",
      type: "file",
      role: "ENTRY POINT",
      description: "The primary file containing the main ms() function that executes when someone uses this package.",
      glossaryTerm: {
        term: "Entry Point",
        meaning: "The first code file that runs when a program or library is loaded by another project.",
      },
    },
    {
      name: "package.json",
      type: "file",
      role: "MANIFEST",
      description: "Lists metadata, version number, scripts, and helper libraries like pretty-ms.",
      glossaryTerm: {
        term: "Manifest",
        meaning: "A configuration file that tells tools what external libraries this project needs to run.",
      },
    },
    {
      name: "test/index.js",
      type: "file",
      role: "TEST SUITE",
      description: "Automated test scripts ensuring milliseconds and string conversions work accurately.",
      glossaryTerm: {
        term: "Test Suite",
        meaning: "A collection of automated scripts that run code through various checks to prove it works.",
      },
    },
    {
      name: "readme.md",
      type: "file",
      role: "DOCUMENTATION",
      description: "Field manual with usage examples, installation instructions, and options.",
      glossaryTerm: {
        term: "README",
        meaning: "The introductory document that explains what a project is and how to install and use it.",
      },
    },
    {
      name: "license",
      type: "file",
      role: "LEGAL CLEARANCE",
      description: "MIT License granting permission for open-source use and modification.",
      glossaryTerm: {
        term: "Open-Source License",
        meaning: "Legal guidelines stating how other developers are permitted to use, modify, and share this code.",
      },
    },
  ],
}

export async function fetchRepoBriefing(owner: string, repo: string): Promise<RepoBriefingData> {
  // If it's the sample repo, return the curated sample case
  if (owner.toLowerCase() === "vercel" && repo.toLowerCase() === "ms") {
    // Artificial small delay for retro scanner feel
    await new Promise((resolve) => setTimeout(resolve, 600))
    return SAMPLE_CASE_VERCEL_MS
  }

  // Fetch live repo info from GitHub API
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found on GitHub. Please check the spelling or ensure it is public.`)
    }
    if (repoRes.status === 403) {
      throw new Error(`GitHub API rate limit reached for unauthenticated requests. You can explore the sample case or try again later.`)
    }
    throw new Error(`Unable to fetch repository data (Status: ${repoRes.status} ${repoRes.statusText}).`)
  }

  const repoData = await repoRes.json()

  // Try to fetch root contents to understand repo structure
  let rootItems: Array<{ name: string; type: "file" | "dir" }> = []
  try {
    const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`)
    if (contentsRes.ok) {
      const contentsData = await contentsRes.json()
      if (Array.isArray(contentsData)) {
        rootItems = contentsData.map((item: { name: string; type: string }) => ({
          name: item.name,
          type: item.type === "dir" ? "dir" : "file",
        }))
      }
    }
  } catch {
    // Gracefully continue without contents if network fails
  }

  // Derive structure map from root items
  const structureMap: StructureItem[] = []

  const findItem = (pattern: RegExp, type?: "file" | "dir") =>
    rootItems.find((item) => pattern.test(item.name) && (!type || item.type === type))

  // Look for README
  const readme = findItem(/^readme(\.(md|txt|rst))?$/i)
  if (readme) {
    structureMap.push({
      name: readme.name,
      type: readme.type,
      role: "FIELD MANUAL",
      description: "The primary project documentation explaining how to install, configure, and use the code.",
      glossaryTerm: {
        term: "README",
        meaning: "The introductory document that explains what a project is and how to install and use it.",
      },
    })
  }

  // Look for Manifest
  const manifest = findItem(/^(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|gemfile)$/i)
  if (manifest) {
    structureMap.push({
      name: manifest.name,
      type: manifest.type,
      role: "MANIFEST",
      description: `Declares the project's external dependencies, version numbers, and build instructions.`,
      glossaryTerm: {
        term: "Manifest",
        meaning: "A configuration file that tells tools what external libraries this project needs to run.",
      },
    })
  }

  // Look for Source Folder
  const src = findItem(/^(src|source|lib|app|packages)$/i, "dir")
  if (src) {
    structureMap.push({
      name: `${src.name}/`,
      type: "dir",
      role: "CORE ENGINE",
      description: `Contains the primary source code implementing this project's core functionality.`,
      glossaryTerm: {
        term: "Source Directory",
        meaning: "The central folder where the actual code files written by the authors live.",
      },
    })
  }

  // Look for Test Folder
  const tests = findItem(/^(tests?|spec|__tests__)$/i, "dir")
  if (tests) {
    structureMap.push({
      name: `${tests.name}/`,
      type: "dir",
      role: "TEST SUITE",
      description: "Automated validation tests ensuring the program functions correctly and catch bugs early.",
      glossaryTerm: {
        term: "Test Suite",
        meaning: "A collection of automated scripts that run code through various checks to prove it works.",
      },
    })
  }

  // Look for Documentation Folder
  const docs = findItem(/^(docs|doc)$/i, "dir")
  if (docs) {
    structureMap.push({
      name: `${docs.name}/`,
      type: "dir",
      role: "INTEL ARCHIVE",
      description: "Detailed architecture guides, tutorials, and API documentation for contributors.",
    })
  }

  // Look for License
  const licenseFile = findItem(/^(license|licence|copying)(\.(md|txt))?$/i)
  if (licenseFile) {
    structureMap.push({
      name: licenseFile.name,
      type: licenseFile.type,
      role: "LEGAL CLEARANCE",
      description: `Official open-source license (${repoData.license?.spdx_id || repoData.license?.name || "Open Source"}).`,
      glossaryTerm: {
        term: "Open-Source License",
        meaning: "Legal guidelines stating how other developers are permitted to use, modify, and share this code.",
      },
    })
  }

  // Look for GitHub Workflows
  const githubDir = findItem(/^\.github$/i, "dir")
  if (githubDir) {
    structureMap.push({
      name: ".github/",
      type: "dir",
      role: "AUTOMATION",
      description: "Automated continuous integration scripts and issue templates used by maintainers.",
      glossaryTerm: {
        term: "CI/CD Workflows",
        meaning: "Automated scripts that run checks or publish code whenever new changes are submitted.",
      },
    })
  }

  // Fallback if root items were empty
  if (structureMap.length === 0) {
    structureMap.push(
      {
        name: "README.md",
        type: "file",
        role: "FIELD MANUAL",
        description: "The primary project guide explaining purpose, installation, and usage.",
      },
      {
        name: "Source Files",
        type: "dir",
        role: "CORE ENGINE",
        description: `Implementation files written in ${repoData.language || "code"}.`,
      },
    )
  }

  const lang = repoData.language || "General Code"
  const desc = repoData.description ? repoData.description.trim() : null

  return {
    owner: repoData.owner?.login || owner,
    repo: repoData.name || repo,
    fullName: repoData.full_name || `${owner}/${repo}`,
    url: repoData.html_url || `https://github.com/${owner}/${repo}`,
    isSample: false,
    description: desc,
    primaryLanguage: repoData.language || null,
    license: repoData.license?.name || (repoData.license?.spdx_id ? `${repoData.license.spdx_id} License` : null),
    stars: repoData.stargazers_count ?? 0,
    forks: repoData.forks_count ?? 0,
    defaultBranch: repoData.default_branch || "main",
    visibility: repoData.visibility || (repoData.private ? "private" : "public"),
    whatItDoes: desc
      ? `${desc}`
      : `An open-source repository developed primarily in ${lang}. Detailed function explanations can be found in the repository's README.`,
    problemSolved:
      `Provides pre-built, tested ${lang} components and solutions so developers don't need to rebuild this logic from scratch.`,
    targetAudience:
      `Software engineers and open-source contributors working within the ${lang} ecosystem.`,
    repositoryOverview:
      `Organized with root manifests, primary ${lang} modules, and documentation for community development.`,
    structureMap,
  }
}
