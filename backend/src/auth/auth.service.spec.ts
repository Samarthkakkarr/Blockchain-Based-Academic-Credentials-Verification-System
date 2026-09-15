import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: { admin: { findUnique: jest.Mock } };
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = { admin: { findUnique: jest.fn() } };
    jwt = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("rejects login for an unknown email", async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: "nobody@demo.edu", password: "whatever1" })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rejects login with a wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    prisma.admin.findUnique.mockResolvedValue({
      id: "1",
      email: "admin@demo.edu",
      passwordHash,
      role: "ADMIN",
    });

    await expect(service.login({ email: "admin@demo.edu", password: "wrong-password" })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("returns a JWT and admin profile on correct credentials", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    prisma.admin.findUnique.mockResolvedValue({
      id: "1",
      name: "Registrar",
      email: "admin@demo.edu",
      passwordHash,
      role: "ADMIN",
    });

    const result = await service.login({ email: "admin@demo.edu", password: "correct-password" });
    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.admin.email).toBe("admin@demo.edu");
  });
});
