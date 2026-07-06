import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PageResult } from '../../../common/dto/pagination.dto';
import { AccessTokenPayload } from '../../identity/application/token.service';
import { CurrentUser } from '../../identity/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/guards/jwt-auth.guard';
import { ListingService } from '../application/listing.service';
import { CreateListingDto } from '../application/dto/create-listing.dto';
import { ListingResponseDto } from '../application/dto/listing.response.dto';
import { QueryListingsDto } from '../application/dto/query-listings.dto';

@ApiTags('Listings')
@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new inventory listing',
    description:
      'Requires an ACTIVE verified pharmacy account. pharmacyId is derived from JWT.',
  })
  @ApiCreatedResponse({ type: ListingResponseDto })
  async create(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ListingResponseDto> {
    return this.listingService.createListing(dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Search and list inventory listings',
    description:
      'Returns paginated listings. Default: ACTIVE listings, newest first. ' +
      'Use ?q= for free-text search, ?type= and ?status= for filters.',
  })
  @ApiOkResponse({ description: 'Paginated listing results' })
  async findAll(@Query() query: QueryListingsDto): Promise<PageResult<ListingResponseDto>> {
    return this.listingService.getListings(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a listing by ID' })
  @ApiOkResponse({ type: ListingResponseDto })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ListingResponseDto> {
    return this.listingService.getListingById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a listing',
    description: 'Marks the listing as deleted without removing it from the database.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Listing not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.listingService.deleteListing(id);
  }
}
