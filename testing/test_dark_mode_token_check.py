from scripts.dark_mode_token_check import find_dark_mode_violations, iter_added_lines


def tokens_for(line: str) -> list[str]:
    violations = find_dark_mode_violations("frontend/src/example.tsx", 1, line)
    return [violation.token for violation in violations]


def test_detecta_colores_claros_sin_dark_mode():
    line = 'className="bg-white text-slate-500 border-slate-100 rounded-lg"'

    assert tokens_for(line) == ["bg-white", "text-slate-500", "border-slate-100"]


def test_permite_clases_con_contraparte_dark():
    line = 'className="bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-300 border-slate-100 dark:border-neutral-700"'

    assert tokens_for(line) == []


def test_permite_tokens_css_del_sistema():
    line = 'className="bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]"'

    assert tokens_for(line) == []


def test_ignora_estados_interactivos_y_supresiones_controladas():
    assert tokens_for('className="hover:bg-white/10 focus:text-slate-500"') == []
    assert tokens_for('className="bg-white" // @dark-mode-ok') == []


def test_parsea_solo_lineas_agregadas_frontend_src():
    diff = """diff --git a/frontend/src/a.tsx b/frontend/src/a.tsx
--- a/frontend/src/a.tsx
+++ b/frontend/src/a.tsx
@@ -1,0 +1,2 @@
+const a = 'className="bg-white"';
+const b = 'className="text-slate-500"';
diff --git a/docs/a.md b/docs/a.md
--- a/docs/a.md
+++ b/docs/a.md
@@ -1,0 +1 @@
+className="bg-white"
"""

    added = iter_added_lines(diff)

    assert [(line.path, line.number) for line in added] == [
        ("frontend/src/a.tsx", 1),
        ("frontend/src/a.tsx", 2),
    ]
