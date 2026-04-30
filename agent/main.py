"""REPL entry point."""
from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

from . import decomposer, exporters, intake, jira_writer, optimizer, prompt_builder
from .session import Session

console = Console()
OUT_DIR = Path("out")


def banner() -> None:
    console.print(
        Panel.fit(
            "[bold cyan]Idea → Jira Workflow Optimizer[/bold cyan]\n"
            "Turn an idea into a team-optimized Jira project plan.",
            border_style="cyan",
        )
    )


def help_msg() -> None:
    console.print(
        "\n[bold]Commands:[/bold]\n"
        "  [cyan]/plan[/cyan]            Generate the project breakdown\n"
        "  [cyan]/revise[/cyan]          Provide feedback to refine the plan\n"
        "  [cyan]/expand <id>[/cyan]     Add sub-tasks to a story\n"
        "  [cyan]/show[/cyan]            Re-render the current project\n"
        "  [cyan]/export[/cyan]          Write Markdown + JSON + Jira CSV to out/\n"
        "  [cyan]/push[/cyan]            Live-create in Jira (requires --push + creds)\n"
        "  [cyan]/help[/cyan]            Show this help\n"
        "  [cyan]/quit[/cyan]            Exit\n"
        "  Anything else is sent to the agent as a free-form message.\n"
    )


def initial_clarify(session: Session) -> None:
    msg = prompt_builder.build_intake_message(session.idea)
    session.add_user(msg)
    with console.status("Thinking..."):
        reply = decomposer.chat(session.messages)
    session.add_assistant(reply)
    console.print(Panel(reply, title="Agent", border_style="blue"))

    answers = intake.read_multiline(
        "Answer the agent's clarifying questions (or type END to skip):"
    )
    if answers:
        session.clarifications["answers"] = answers
        session.add_user(answers)


def generate(session: Session) -> None:
    msg = prompt_builder.build_generate_message(
        session.idea, session.team_as_json(), session.clarifications
    )
    session.add_user(msg)
    with console.status("Generating project..."):
        reply = decomposer.chat(session.messages)
    session.add_assistant(reply)

    project = decomposer.extract_project_json(reply)
    if project is None:
        console.print("[red]Could not parse project JSON. Raw reply:[/red]")
        console.print(reply)
        return
    session.project = optimizer.annotate(project)
    exporters.render_terminal(session.project)


def revise(session: Session, feedback: str) -> None:
    if not session.project:
        console.print("[yellow]No project yet. Run /plan first.[/yellow]")
        return
    session.add_user(prompt_builder.build_revise_message(feedback))
    with console.status("Revising..."):
        reply = decomposer.chat(session.messages)
    session.add_assistant(reply)
    project = decomposer.extract_project_json(reply)
    if project is None:
        console.print("[red]Could not parse revised project JSON.[/red]")
        return
    session.project = optimizer.annotate(project)
    exporters.render_terminal(session.project)


def expand(session: Session, story_id: str) -> None:
    if not session.project:
        console.print("[yellow]No project yet. Run /plan first.[/yellow]")
        return
    session.add_user(prompt_builder.build_expand_message(story_id))
    with console.status(f"Expanding {story_id}..."):
        reply = decomposer.chat(session.messages)
    session.add_assistant(reply)
    project = decomposer.extract_project_json(reply)
    if project is None:
        console.print("[red]Could not parse expanded project JSON.[/red]")
        return
    session.project = optimizer.annotate(project)
    exporters.render_terminal(session.project)


def export(session: Session) -> None:
    if not session.project:
        console.print("[yellow]Nothing to export yet.[/yellow]")
        return
    paths = exporters.export_all(session.project, OUT_DIR)
    console.print("[green]✓ Exported:[/green]")
    for k, p in paths.items():
        console.print(f"  • {k}: {p}")


def push(session: Session) -> None:
    if not session.push_enabled:
        console.print(
            "[yellow]Push is disabled. Re-launch with --push to enable.[/yellow]"
        )
        return
    if not session.project:
        console.print("[yellow]No project to push.[/yellow]")
        return
    if not jira_writer.has_credentials():
        console.print(
            "[red]Missing Jira credentials. Set JIRA_URL/EMAIL/TOKEN/PROJECT_KEY in .env[/red]"
        )
        return
    console.print(jira_writer.diff_summary(session.project))
    if not Confirm.ask("Proceed?", default=False):
        return
    with console.status("Creating issues in Jira..."):
        mapping = jira_writer.push(session.project)
    console.print(f"[green]✓ Created {len(mapping)} issues.[/green]")
    for internal, jira_key in mapping.items():
        console.print(f"  {internal} → {jira_key}")


def free_chat(session: Session, text: str) -> None:
    session.add_user(text)
    with console.status("Thinking..."):
        reply = decomposer.chat(session.messages)
    session.add_assistant(reply)
    console.print(Panel(reply, title="Agent", border_style="blue"))


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    push_enabled = "--push" in argv

    load_dotenv()
    banner()

    session = Session(push_enabled=push_enabled)
    if push_enabled:
        console.print("[yellow]Push mode enabled — /push will create live Jira issues.[/yellow]")

    intake.gather_idea(session)
    if not session.idea:
        console.print("[red]No idea provided. Exiting.[/red]")
        return 1

    initial_clarify(session)
    intake.gather_team(session)
    help_msg()

    while True:
        try:
            user_input = Prompt.ask("\n[bold magenta]you[/bold magenta]").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]bye[/dim]")
            return 0

        if not user_input:
            continue

        parts = user_input.split(maxsplit=1)
        cmd = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""

        if cmd in ("/quit", "/exit"):
            return 0
        if cmd == "/help":
            help_msg()
            continue
        if cmd == "/plan":
            generate(session)
            continue
        if cmd == "/show":
            if session.project:
                exporters.render_terminal(session.project)
            else:
                console.print("[yellow]No project yet.[/yellow]")
            continue
        if cmd == "/revise":
            feedback = arg or intake.read_multiline("Feedback:")
            if feedback.strip():
                revise(session, feedback)
            continue
        if cmd == "/expand":
            if not arg:
                console.print("[yellow]Usage: /expand <story-id>[/yellow]")
                continue
            expand(session, arg.strip())
            continue
        if cmd == "/export":
            export(session)
            continue
        if cmd == "/push":
            push(session)
            continue

        free_chat(session, user_input)


if __name__ == "__main__":
    raise SystemExit(main())
