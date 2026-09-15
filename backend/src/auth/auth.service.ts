import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });

    // Constant-shape error to avoid leaking whether the email exists.
    if (!admin) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async me(userId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: userId } });
    if (!admin) throw new UnauthorizedException();
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
  }
}
