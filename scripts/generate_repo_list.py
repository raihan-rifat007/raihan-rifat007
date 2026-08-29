import requests
import re
import os

username = "raihan-rifat007"
token = os.environ.get('GITHUB_TOKEN')

headers = {
    'Authorization': f'token {token}',
    'Accept': 'application/vnd.github.v3+json'
}

repos = []
page = 1
while True:
    url = f'https://api.github.com/users/{username}/repos?page={page}&per_page=100&sort=updated&type=public'
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        break
    data = response.json()
    if not data:
        break
    repos.extend(data)
    page += 1

print(f"Found {len(repos)} repositories")

filtered_repos = [repo for repo in repos if not repo['fork']]
top_repos = filtered_repos[:6]

def get_tech_stack(repo):
    topics = repo.get('topics', [])
    if topics:
        return ' • '.join([t.capitalize() for t in topics[:3]])
    language = repo.get('language')
    if language:
        return language
    return 'Various'

table_rows = []
for repo in top_repos:
    name = repo['name']
    description = repo['description'] or 'No description available'
    url = repo['html_url']
    tech = get_tech_stack(repo)
    row = f"| **{name}** | {description[:80]}{'...' if len(description) > 80 else ''} | {tech} | [![Repo](https://img.shields.io/badge/∆_Repo-0d47a1?style=flat-square)]({url}) |"
    table_rows.append(row)

table_header = "| Project | Description | Tech Stack | Links |"
table_separator = "|---------|-------------|-----------|-------|"
table_body = "\n".join(table_rows)
new_table = f"{table_header}\n{table_separator}\n{table_body}"

readme_path = 'README.md'

if not os.path.exists(readme_path):
    print(f"Error: {readme_path} not found!")
    exit(1)

with open(readme_path, 'r', encoding='utf-8') as file:
    content = file.read()

print("Found README.md")

new_section = f'''## Featured Projects

<div align="center">

### My Best Work

{new_table}

<br>

#### **[View All Projects →](https://github.com/raihan-rifat007?tab=repositories)**

</div>'''

# Try to find and replace the section
if '## Featured Projects' in content:
    pattern = r'## Featured Projects.*?(?=\n##|\Z)'
    updated_content = re.sub(pattern, new_section, content, flags=re.DOTALL)
    print("Found and replaced Featured Projects section")
else:
    print("Warning: '## Featured Projects' not found in README")
    updated_content = content

# Write the file
with open(readme_path, 'w', encoding='utf-8') as file:
    file.write(updated_content)

print("README update completed!")
