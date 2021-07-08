#!/usr/bin/env bash
set -o errexit ; set -o errtrace ; set -o pipefail

git config --global user.email "devops@wisetime.com"
git config --global user.name "WiseTime Bot"
git reset --hard
git clean -fd
git fetch --tags
# Create Orphan branch
git checkout --orphan temp_branch
# Remove unwanted files/dirs from the repo and create fresh commit
rm -rf bamboo-specs 
rm -rf scripts/mirror.sh
rm .drone.yml
git add -A
git commit -am "Mirror Repo"
# Delete master branch
git branch -D master
# Rename current orphan branch as master
git branch -m master
mkdir -p ~/.ssh
# Ensure we can talk to GitHub
ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
mkdir -p /tmp/.ssh
echo "${GITHUB_SSH_KEY_B64}" | base64 -d > /tmp/.ssh/github.key
chmod 600 /tmp/.ssh/github.key
# Push to GitHub mirror
git remote add github git@github.com:wisetime-io/grpc-web-rx.git
GIT_SSH_COMMAND='ssh -i /tmp/.ssh/github.key' git push -f github master --tags
rm -rf /tmp/.ssh
echo "Push to GitHub mirror complete"
