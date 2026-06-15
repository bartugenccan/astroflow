import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  CreateBirthProfileDto,
} from './dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: CreateUserDto) {
    return this.usersService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return this.usersService.login(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Delete('account')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@Req() req: any) {
    return this.usersService.deleteAccount(req.user.userId);
  }

  @Post('birth-profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set or update birth profile' })
  async setBirthProfile(@Req() req: any, @Body() dto: CreateBirthProfileDto) {
    return this.usersService.setBirthProfile(req.user.userId, dto);
  }

  @Get('birth-profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get birth profile' })
  async getBirthProfile(@Req() req: any) {
    return this.usersService.getBirthProfile(req.user.userId);
  }
}
