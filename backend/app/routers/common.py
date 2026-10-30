"""Shared helpers to turn API schemas into compute objects."""
from __future__ import annotations

from ..compute.geometry import CompositeSection, GirderSection
from ..compute.materials import Concrete, MaterialSet, PrestressingSteel, Rebar
from ..models.schemas import SectionConfig


def build_section(cfg: SectionConfig) -> CompositeSection:
    g = GirderSection(
        bf_bot=cfg.girder.bf_bot, tf_bot=cfg.girder.tf_bot,
        h_fillet_bot=cfg.girder.h_fillet_bot, tw=cfg.girder.tw, hw=cfg.girder.hw,
        h_fillet_top=cfg.girder.h_fillet_top, bf_top=cfg.girder.bf_top,
        tf_top=cfg.girder.tf_top,
    )
    mats = MaterialSet(
        concrete=Concrete(fck=cfg.fck_girder, name=f"M{int(cfg.fck_girder)}"),
        deck_concrete=Concrete(fck=cfg.fck_deck, name=f"M{int(cfg.fck_deck)}"),
        rebar=Rebar(), tendon=PrestressingSteel(),
    )
    return CompositeSection(
        girder=g, deck_thickness=cfg.deck_thickness,
        girder_spacing=cfg.girder_spacing, span=cfg.span,
        n_girders=cfg.n_girders, materials=mats,
    )
