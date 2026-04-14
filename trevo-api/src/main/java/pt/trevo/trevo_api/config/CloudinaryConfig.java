package pt.trevo.trevo_api.config;

import com.cloudinary.Cloudinary;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary() {
        // This will automatically read the CLOUDINARY_URL from your docker-compose environment
        return new Cloudinary();
    }
}