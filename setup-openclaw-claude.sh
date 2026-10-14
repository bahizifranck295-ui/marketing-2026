#!/usr/bin/env bash
# Installe Claude Code + OpenClaw et branche OpenClaw sur Claude Code (abonnement Pro/Max, sans clé API).
# Usage : bash setup-openclaw-claude.sh
# Fonctionne sur macOS et Linux (sous Windows : utiliser WSL).
set -euo pipefail

etape() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
ok()    { printf '\033[1;32m✔ %s\033[0m\n' "$1"; }
alerte(){ printf '\033[1;33m⚠ %s\033[0m\n' "$1"; }
erreur(){ printf '\033[1;31m✘ %s\033[0m\n' "$1"; exit 1; }

# --- 1. Node.js (requis par OpenClaw) ---------------------------------------
etape "1/6 Vérification de Node.js"
if ! command -v node >/dev/null 2>&1; then
  erreur "Node.js n'est pas installé. Installe Node 22 ou plus récent (https://nodejs.org) puis relance ce script."
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then
  erreur "Node $(node -v) est trop ancien. Installe Node 22 ou plus récent puis relance ce script."
fi
ok "Node $(node -v)"

# --- 2. Claude Code -----------------------------------------------------------
etape "2/6 Installation de Claude Code"
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code déjà installé : $(claude --version)"
else
  curl -fsSL https://claude.ai/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
  command -v claude >/dev/null 2>&1 || erreur "Claude Code installé mais introuvable dans le PATH. Ouvre un nouveau terminal et relance."
  ok "Claude Code installé : $(claude --version)"
fi

# --- 3. Pas de clé API : on force l'abonnement --------------------------------
etape "3/6 Vérification qu'aucune clé API n'est utilisée"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  alerte "ANTHROPIC_API_KEY est définie : elle prendrait le dessus sur ton abonnement."
  alerte "Elle est retirée pour ce script. Supprime-la aussi de ~/.bashrc / ~/.zshrc."
  unset ANTHROPIC_API_KEY
fi
ok "Aucune clé API active"

# --- 4. Connexion à l'abonnement (la seule étape manuelle) --------------------
etape "4/6 Connexion de Claude Code à ton abonnement"
if claude -p "Réponds uniquement: OK" >/dev/null 2>&1; then
  ok "Claude Code est déjà connecté"
else
  echo "Claude Code va s'ouvrir. Dedans :"
  echo "   1) tape  /login"
  echo "   2) choisis « Claude account with subscription »"
  echo "   3) valide dans le navigateur"
  echo "   4) tape  /exit  pour revenir ici"
  read -r -p "Appuie sur Entrée pour ouvrir Claude Code..." _
  claude || true
  claude -p "Réponds uniquement: OK" >/dev/null 2>&1 \
    || erreur "La connexion n'a pas fonctionné. Relance le script et refais /login."
  ok "Claude Code est connecté à ton abonnement"
fi

# --- 5. OpenClaw --------------------------------------------------------------
etape "5/6 Installation d'OpenClaw"
if command -v openclaw >/dev/null 2>&1; then
  ok "OpenClaw déjà installé"
else
  npm install -g openclaw@latest
  ok "OpenClaw installé"
fi
if [ ! -d "$HOME/.openclaw" ]; then
  echo "Première configuration d'OpenClaw (assistant interactif)."
  echo "Quand il demande le fournisseur de modèle : choisis Anthropic → Claude CLI (pas API key)."
  read -r -p "Appuie sur Entrée pour lancer l'assistant..." _
  openclaw onboard --install-daemon
fi

# --- 6. Brancher OpenClaw sur Claude Code -------------------------------------
etape "6/6 OpenClaw utilise Claude Code comme cerveau"
openclaw models auth login --provider anthropic --method cli --set-default
echo
openclaw models status || true
openclaw gateway status || true

echo
ok "Terminé. Chemin de claude à donner à OpenClaw si son service ne le trouve pas : $(command -v claude)"
echo "   (champ agents.defaults.cliBackends → command dans la config OpenClaw)"
