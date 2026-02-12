package com.ecommerce.backend.banner;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.ecommerce.backend.banner.dto.BannerResponse;
import com.ecommerce.backend.banner.dto.UpdateBannerRequest;
import com.ecommerce.backend.common.BadRequestException;
import com.ecommerce.backend.common.NotFoundException;
import com.ecommerce.backend.storage.StorageService;

@Service
public class BannerService {

    private final BannerRepository bannerRepository;
    private final StorageService storageService;

    public BannerService(BannerRepository bannerRepository, StorageService storageService) {
        this.bannerRepository = bannerRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "public-banners")
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
    @CacheEvict(cacheNames = "public-banners", allEntries = true)
    public BannerResponse create(String title, Integer sortOrder, Boolean active, MultipartFile image) {
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Banner title is required.");
        }

        Banner banner = new Banner();
        banner.setTitle(title.trim());
        banner.setSortOrder(sortOrder == null ? 0 : sortOrder);
        banner.setActive(active == null || active);
        banner.setImageUrl(storageService.storeBanner(image));
        return BannerResponse.from(bannerRepository.save(banner));
    }

    @Transactional
    @CacheEvict(cacheNames = "public-banners", allEntries = true)
    public BannerResponse update(Long id, UpdateBannerRequest request) {
        Banner banner = findBanner(id);
        banner.setTitle(request.title().trim());
        banner.setSortOrder(request.sortOrder());
        banner.setActive(request.active());
        return BannerResponse.from(bannerRepository.save(banner));
    }

    @Transactional
    @CacheEvict(cacheNames = "public-banners", allEntries = true)
    public void delete(Long id) {
        Banner banner = findBanner(id);
        bannerRepository.delete(banner);
        storageService.deleteByPublicPath(banner.getImageUrl());
    }

    private Banner findBanner(Long id) {
        return bannerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Banner not found."));
    }
}
