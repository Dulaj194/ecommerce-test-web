package com.ecommerce.backend.banner;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.banner.dto.BannerResponse;
import com.ecommerce.backend.banner.dto.UpdateBannerRequest;
import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.storage.FileStorageService;

@Service
public class BannerService {

    private final BannerRepository bannerRepository;
    private final FileStorageService fileStorageService;

    public BannerService(BannerRepository bannerRepository, FileStorageService fileStorageService) {
        this.bannerRepository = bannerRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<BannerResponse> listPublic() {
        return bannerRepository.findByActiveTrueOrderBySortOrderAscIdAsc()
                .stream()
                .map(BannerResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BannerResponse> listAdmin() {
        return bannerRepository.findAllByOrderBySortOrderAscIdAsc()
                .stream()
                .map(BannerResponse::from)
                .toList();
    }

    @Transactional
    public BannerResponse create(String title, Integer sortOrder, Boolean active, MultipartFile image) {
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Banner title is required.");
        }

        Banner banner = new Banner();
        banner.setTitle(title.trim());
        banner.setSortOrder(sortOrder == null ? 0 : sortOrder);
        banner.setActive(active == null || active);
        banner.setImageUrl(fileStorageService.storeBanner(image));
        return BannerResponse.from(bannerRepository.save(banner));
    }

    @Transactional
    public BannerResponse update(Long id, UpdateBannerRequest request) {
        Banner banner = findBanner(id);
        banner.setTitle(request.title().trim());
        banner.setSortOrder(request.sortOrder());
        banner.setActive(request.active());
        return BannerResponse.from(bannerRepository.save(banner));
    }

    @Transactional
    public void delete(Long id) {
        Banner banner = findBanner(id);
        bannerRepository.delete(banner);
        fileStorageService.deleteByPublicPath(banner.getImageUrl());
    }

    private Banner findBanner(Long id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Banner not found."));
    }
}
