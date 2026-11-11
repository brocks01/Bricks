"""The tools Buddy can use (tools.json), filtered per channel and phone.

Each tool is a Gemini function declaration plus what our orchestrator needs to know:
whether it changes the member's data (then it needs a "yes" first), where it may be
used, and which app action it triggers.
"""

import json
from functools import cache
from pathlib import Path
from typing import Any, Literal

from google.genai import types
from pydantic import BaseModel, ConfigDict, Field

from ..schemas import ChannelPref

Platform = Literal["android", "ios"]
UiActionType = Literal[
    "confirm",
    "navigate",
    "highlight",
    "fill",
    "start_walk",
    "finish_walk",
    "start_warmup",
    "open_sos",
    "choices",
]

TOOLS_FILE = Path(__file__).with_name("tools.json")


class ToolSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    description: str = Field(min_length=10)
    parameters: dict[str, Any]
    mutating: bool
    channels: list[ChannelPref] = Field(min_length=1)
    ui_action: UiActionType | None
    priority: Literal["P0", "P1"]
    platforms: list[Platform] | None = None

    def available(self, channel: ChannelPref, platform: Platform | None = None) -> bool:
        if channel not in self.channels:
            return False
        return self.platforms is None or platform is None or platform in self.platforms

    def declaration(self) -> types.FunctionDeclaration:
        return types.FunctionDeclaration(
            name=self.name,
            description=self.description,
            parameters_json_schema=self.parameters,
        )


class ToolFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int
    notes: list[str]
    tools: list[ToolSpec]


@cache
def all_tools() -> dict[str, ToolSpec]:
    """Every tool by name (read once). Raises if the file breaks the contract."""
    spec = ToolFile.model_validate(json.loads(TOOLS_FILE.read_text(encoding="utf-8")))
    names = [t.name for t in spec.tools]
    if len(names) != len(set(names)):
        raise ValueError("tools.json: duplicate tool names")
    return {t.name: t for t in spec.tools}


def tools_for(
    channel: ChannelPref, platform: Platform | None = None, *, include_p1: bool = True
) -> list[ToolSpec]:
    """The tools the model may call on this channel (and phone)."""
    return [
        t
        for t in all_tools().values()
        if t.available(channel, platform) and (include_p1 or t.priority == "P0")
    ]


def gemini_tool(
    channel: ChannelPref, platform: Platform | None = None, *, include_p1: bool = True
) -> types.Tool:
    """The tool list in the form Gemini's API takes."""
    return types.Tool(
        function_declarations=[
            t.declaration() for t in tools_for(channel, platform, include_p1=include_p1)
        ]
    )


def is_mutating(name: str) -> bool:
    """True if the tool changes the member's data, so it needs a "yes" first."""
    tool = all_tools().get(name)
    return tool.mutating if tool else False
