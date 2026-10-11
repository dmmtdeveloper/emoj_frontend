import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEAM, teamFaces, teamSize, type Department } from "../src/lib/team";

const members = TEAM.flatMap((d) => d.members);

describe("TEAM", () => {
  it("keeps the departments of the current emoj.cl, in order", () => {
    expect(TEAM.map((d) => d.name)).toEqual([
      "Gerencia",
      "Departamento de Ingeniería",
      "Departamento de Dibujo",
      "Departamento de Administración",
    ]);
  });

  it("has the 13 people shown on emoj.cl/nosotros", () => {
    expect(members).toHaveLength(13);
  });

  it.each(members.map((m) => [m.name, m] as const))(
    "%s has a first and last name separated by a space",
    (_name, member) => {
      expect(member.name).toMatch(/^\p{Lu}\p{L}+ \p{Lu}\p{L}+$/u);
      expect(member.role.trim()).not.toBe("");
    },
  );

  it("points every photo to an existing optimized file", () => {
    for (const member of members) {
      if (member.photo) {
        expect(
          existsSync(`src/assets/team/${member.photo}.jpg`),
          member.photo,
        ).toBe(true);
      }
    }
  });

  it("uses initials only for the people without a real photo", () => {
    expect(members.filter((m) => !m.photo).map((m) => m.name)).toEqual([
      "Cristóbal Cea",
      "Patricio Astorga",
      "Diego Abuyeres",
      "Maxell Cayupe",
    ]);
  });
});

describe("teamFaces", () => {
  const dept = (name: string, people: [string, string?][]): Department => ({
    name,
    members: people.map(([n, photo]) => ({
      name: n,
      role: "Ingeniero Civil",
      ...(photo ? { photo } : {}),
    })),
  });

  it("takes the first people with a photo, in team order, and counts everyone else", () => {
    const team = [
      dept("Gerencia", [["Ana Pérez", "ana"]]),
      dept("Ingeniería", [
        ["Luis Soto"],
        ["Rosa Díaz", "rosa"],
        ["Iván Mora", "ivan"],
      ]),
    ];
    const { faces, others } = teamFaces(team, 2);
    expect(faces.map((m) => m.name)).toEqual(["Ana Pérez", "Rosa Díaz"]);
    expect(others).toBe(2);
  });

  it("never asks for more faces than there are photos", () => {
    const team = [dept("Gerencia", [["Ana Pérez", "ana"], ["Luis Soto"]])];
    const { faces, others } = teamFaces(team, 5);
    expect(faces.map((m) => m.name)).toEqual(["Ana Pérez"]);
    expect(others).toBe(1);
  });

  it("works with the real team", () => {
    const { faces, others } = teamFaces(TEAM, 4);
    expect(faces).toHaveLength(4);
    expect(faces.every((m) => m.photo)).toBe(true);
    expect(others).toBe(members.length - 4);
  });
});

describe("teamSize", () => {
  it("counts every person across departments", () => {
    expect(teamSize(TEAM)).toBe(13);
    expect(teamSize([])).toBe(0);
  });
});
