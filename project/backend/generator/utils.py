import re
import shutil
from pathlib import Path
from typing import Any

RENDERABLE_EXTENSIONS = {".sh", ".conf", ".env", ".txt", ".yml", ".yaml"}


def render(text: str, config: dict[str, Any]) -> str:
    """
    Render a template string with the given config dict.

    Supports:
      {{key}}               → simple substitution
      {{#flag}}...{{/flag}} → conditional block (truthy if non-empty / non-false)
    """
    def replace_block(match):
        key = match.group(1)
        content = match.group(2)
        value = config.get(key, False)
        if isinstance(value, str):
            value = value.strip().lower() not in ("false", "0", "", "none")
        return content if value else ""

    text = re.sub(
        r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}",
        replace_block,
        text,
        flags=re.DOTALL,
    )

    for key, value in config.items():
        text = text.replace("{{" + key + "}}", str(value) if value is not None else "")

    return text


def dotted_mask_to_cidr(mask: str) -> str:
    """Convert '255.255.255.0' → '24'. Pass-through if already numeric."""
    if "." in str(mask):
        return str(sum(bin(int(x)).count("1") for x in mask.split(".")))
    return str(mask)


def copy_and_render_template(
    template_path: Path,
    output_path: Path,
    config: dict[str, Any],
) -> None:
    """
    Copy a template directory to output_path and render all renderable files
    in-place with the given config.
    """
    if output_path.exists():
        shutil.rmtree(output_path)
    shutil.copytree(template_path, output_path)

    for file in output_path.rglob("*"):
        if file.is_file() and file.suffix in RENDERABLE_EXTENSIONS:
            rendered = render(file.read_text(), config)
            file.write_text(rendered)