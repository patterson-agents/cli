/* ============================================================
   Patterson Docs — imported link collections
   Rendered as VitePress-style reference index pages.
   Sources: awesome-copilot.github.com/llms.txt, docs.github.com/llms.txt,
   github.com/modelcontextprotocol/ext-apps, agentskills.io/llms.txt
   ============================================================ */

const RAW = 'https://raw.githubusercontent.com/github/awesome-copilot/main';

window.DOCS_COLLECTIONS = {
  'ref-copilot-agents': {
    source: 'https://awesome-copilot.github.com/llms.txt',
    note: 'Custom GitHub Copilot agents. A representative catalog imported from the Awesome Copilot llms.txt — 150+ agents are published; see the source index for the complete list.',
    groups: [
      { heading: 'Architecture & planning', items: [
        ['.NET Self-Learning Architect', RAW + '/agents/dotnet-self-learning-architect.agent.md'],
        ['API Architect', RAW + '/agents/api-architect.agent.md'],
        ['Senior Cloud Architect', RAW + '/agents/arch.agent.md'],
        ['Context Architect', RAW + '/agents/context-architect.agent.md'],
        ['Plan Mode — Strategic Planning', RAW + '/agents/plan.agent.md'],
        ['Project Architecture Planner', RAW + '/agents/project-architecture-planner.agent.md'],
        ['Implementation Plan Generation', RAW + '/agents/implementation-plan.agent.md'],
        ['Principal Software Engineer', RAW + '/agents/principal-software-engineer.agent.md'],
      ]},
      { heading: 'Cloud & infrastructure', items: [
        ['AWS Cloud Expert', RAW + '/agents/aws-cloud-expert.agent.md'],
        ['Azure Principal Architect', RAW + '/agents/azure-principal-architect.agent.md'],
        ['Azure SaaS Architect', RAW + '/agents/azure-saas-architect.agent.md'],
        ['Bicep Specialist', RAW + '/agents/bicep-implement.agent.md'],
        ['Terraform Agent', RAW + '/agents/terraform.agent.md'],
        ['Azure AVM Terraform mode', RAW + '/agents/azure-verified-modules-terraform.agent.md'],
        ['Platform SRE for Kubernetes', RAW + '/agents/platform-sre-kubernetes.agent.md'],
        ['Arm Migration Agent', RAW + '/agents/arm-migration.agent.md'],
      ]},
      { heading: 'Language experts', items: [
        ['C# Expert', RAW + '/agents/CSharpExpert.agent.md'],
        ['C++ Expert', RAW + '/agents/expert-cpp-software-engineer.agent.md'],
        ['Expert React Frontend Engineer', RAW + '/agents/expert-react-frontend-engineer.agent.md'],
        ['Expert Vue.js Frontend Engineer', RAW + '/agents/vuejs-expert.agent.md'],
        ['Next.js Expert', RAW + '/agents/expert-nextjs-developer.agent.md'],
        ['Expert Nuxt Developer', RAW + '/agents/nuxt-expert.agent.md'],
        ['Laravel Expert', RAW + '/agents/laravel-expert-agent.agent.md'],
        ['Drupal Expert', RAW + '/agents/drupal-expert.agent.md'],
      ]},
      { heading: 'MCP server experts', items: [
        ['TypeScript MCP Server Expert', RAW + '/agents/typescript-mcp-expert.agent.md'],
        ['Python MCP Server Expert', RAW + '/agents/python-mcp-expert.agent.md'],
        ['Go MCP Server Development Expert', RAW + '/agents/go-mcp-expert.agent.md'],
        ['C# MCP Server Expert', RAW + '/agents/csharp-mcp-expert.agent.md'],
        ['Rust MCP Expert', RAW + '/agents/rust-mcp-expert.agent.md'],
        ['Java MCP Expert', RAW + '/agents/java-mcp-expert.agent.md'],
        ['Kotlin MCP Server Expert', RAW + '/agents/kotlin-mcp-expert.agent.md'],
        ['Swift MCP Expert', RAW + '/agents/swift-mcp-expert.agent.md'],
      ]},
      { heading: 'Quality, testing & security', items: [
        ['Accessibility Expert', RAW + '/agents/accessibility.agent.md'],
        ['Playwright Tester Mode', RAW + '/agents/playwright-tester.agent.md'],
        ['Quality Playbook', RAW + '/agents/quality-playbook.agent.md'],
        ['WG Code Sentinel (security)', RAW + '/agents/wg-code-sentinel.agent.md'],
        ['SAST/SCA Security Analyzer', RAW + '/agents/sast-sca-security-analyzer.agent.md'],
        ['Debug Mode', RAW + '/agents/debug.agent.md'],
        ['Critical Thinking Mode', RAW + '/agents/critical-thinking.agent.md'],
        ['Doublecheck', RAW + '/agents/doublecheck.agent.md'],
      ]},
      { heading: 'Docs & product', items: [
        ['SE: Tech Writer', RAW + '/agents/se-technical-writer.agent.md'],
        ['SE: Product Manager', RAW + '/agents/se-product-manager-advisor.agent.md'],
        ['SE: UX Designer', RAW + '/agents/se-ux-ui-designer.agent.md'],
        ['Create PRD Chat Mode', RAW + '/agents/prd.agent.md'],
        ['ADR Generator', RAW + '/agents/adr-generator.agent.md'],
        ['Project Documenter', RAW + '/agents/project-documenter.agent.md'],
        ['Mentor mode', RAW + '/agents/mentor.agent.md'],
        ['Prompt Engineer', RAW + '/agents/prompt-engineer.agent.md'],
      ]},
    ],
  },

  'ref-copilot-instructions': {
    source: 'https://awesome-copilot.github.com/llms.txt',
    note: 'Coding-standard instruction files applied to specific file patterns. A representative catalog imported from the Awesome Copilot llms.txt; the source index lists the complete set.',
    groups: [
      { heading: 'Languages', items: [
        ['C#', RAW + '/instructions/csharp.instructions.md'],
        ['Go', RAW + '/instructions/go.instructions.md'],
        ['Rust', RAW + '/instructions/rust.instructions.md'],
        ['Dart & Flutter', RAW + '/instructions/dart-n-flutter.instructions.md'],
        ['Ruby on Rails', RAW + '/instructions/ruby-on-rails.instructions.md'],
        ['PowerShell', RAW + '/instructions/powershell.instructions.md'],
        ['Shell', RAW + '/instructions/shell.instructions.md'],
        ['R', RAW + '/instructions/r.instructions.md'],
      ]},
      { heading: 'Frameworks', items: [
        ['Next.js', RAW + '/instructions/nextjs.instructions.md'],
        ['Next.js + Tailwind', RAW + '/instructions/nextjs-tailwind.instructions.md'],
        ['NestJS', RAW + '/instructions/nestjs.instructions.md'],
        ['Svelte', RAW + '/instructions/svelte.instructions.md'],
        ['Blazor', RAW + '/instructions/blazor.instructions.md'],
        ['Spring Boot', RAW + '/instructions/springboot.instructions.md'],
        ['Quarkus', RAW + '/instructions/quarkus.instructions.md'],
        ['Astro', RAW + '/instructions/astro.instructions.md'],
      ]},
      { heading: 'DevOps & cloud', items: [
        ['Docker best practices', RAW + '/instructions/containerization-docker-best-practices.instructions.md'],
        ['Kubernetes deployment', RAW + '/instructions/kubernetes-deployment-best-practices.instructions.md'],
        ['GitHub Actions CI/CD', RAW + '/instructions/github-actions-ci-cd-best-practices.instructions.md'],
        ['Terraform', RAW + '/instructions/terraform.instructions.md'],
        ['Bicep best practices', RAW + '/instructions/bicep-code-best-practices.instructions.md'],
        ['DevOps core principles', RAW + '/instructions/devops-core-principles.instructions.md'],
        ['Ansible', RAW + '/instructions/ansible.instructions.md'],
        ['Makefile', RAW + '/instructions/makefile.instructions.md'],
      ]},
      { heading: 'Quality & docs', items: [
        ['Security & OWASP', RAW + '/instructions/security-and-owasp.instructions.md'],
        ['Accessibility (a11y)', RAW + '/instructions/a11y.instructions.md'],
        ['Performance optimization', RAW + '/instructions/performance-optimization.instructions.md'],
        ['QA engineering best practices', RAW + '/instructions/qa-engineering-best-practices.instructions.md'],
        ['Markdown', RAW + '/instructions/markdown.instructions.md'],
        ['Self-explanatory code commenting', RAW + '/instructions/self-explanatory-code-commenting.instructions.md'],
        ['Agent skills authoring', RAW + '/instructions/agent-skills.instructions.md'],
        ['Context engineering', RAW + '/instructions/context-engineering.instructions.md'],
      ]},
    ],
  },

  'ref-mcp-sdk': {
    source: 'https://github.com/modelcontextprotocol/ext-apps',
    note: 'The @modelcontextprotocol/ext-apps SDK serves three roles: building Views, embedding Views as a host, and registering tools with UI metadata.',
    groups: [
      { heading: 'SDK packages', items: [
        ['@modelcontextprotocol/ext-apps — build interactive Views', 'https://apps.extensions.modelcontextprotocol.io/api/modules/app.html'],
        ['/react — React hooks (useApp, useHostStyles)', 'https://apps.extensions.modelcontextprotocol.io/api/modules/_modelcontextprotocol_ext-apps_react.html'],
        ['/app-bridge — embed Views in a chat client', 'https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html'],
        ['/server — register tools & resources', 'https://apps.extensions.modelcontextprotocol.io/api/modules/server.html'],
      ]},
      { heading: 'Example servers', items: [
        ['Map (CesiumJS globe)', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server'],
        ['Three.js scene renderer', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/threejs-server'],
        ['ShaderToy (GLSL)', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/shadertoy-server'],
        ['Cohort Heatmap', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/cohort-heatmap-server'],
        ['Scenario Modeler', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/scenario-modeler-server'],
        ['Customer Segmentation', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/customer-segmentation-server'],
        ['PDF viewer', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/pdf-server'],
        ['QR Code (Python)', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server'],
      ]},
      { heading: 'Starter templates', items: [
        ['React', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react'],
        ['Vue', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-vue'],
        ['Svelte', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte'],
        ['Preact', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-preact'],
        ['Solid', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-solid'],
        ['Vanilla JS', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-vanillajs'],
      ]},
    ],
  },
};
