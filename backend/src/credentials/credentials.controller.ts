import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CredentialsService } from "./credentials.service";
import { IssueCredentialDto } from "./dto/issue-credential.dto";
import { RevokeCredentialDto } from "./dto/revoke-credential.dto";
import { ListCredentialsQueryDto } from "./dto/list-credentials-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // ---- Admin (protected) ----

  @UseGuards(JwtAuthGuard)
  @Post()
  issue(@Body() dto: IssueCredentialDto, @Req() req: any) {
    return this.credentialsService.issue(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Query() query: ListCredentialsQueryDto) {
    return this.credentialsService.list(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("stats")
  stats() {
    return this.credentialsService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Post(":credentialId/revoke")
  revoke(
    @Param("credentialId") credentialId: string,
    @Body() dto: RevokeCredentialDto,
    @Req() req: any
  ) {
    return this.credentialsService.revoke(credentialId, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":credentialId/retry-anchor")
  retryAnchor(@Param("credentialId") credentialId: string) {
    return this.credentialsService.retryAnchor(credentialId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":credentialId")
  getOne(@Param("credentialId") credentialId: string) {
    return this.credentialsService.findByCredentialId(credentialId, true);
  }

  // ---- Public ----

  @Get(":credentialId/verify")
  verify(@Param("credentialId") credentialId: string) {
    return this.credentialsService.verify(credentialId);
  }

  /** Public, non-sensitive credential view for the student's shareable page. */
  @Get(":credentialId/public")
  getPublic(@Param("credentialId") credentialId: string) {
    return this.credentialsService.findByCredentialId(credentialId, false);
  }
}
