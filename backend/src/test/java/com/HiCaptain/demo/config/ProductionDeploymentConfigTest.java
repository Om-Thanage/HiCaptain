package com.HiCaptain.demo.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

class ProductionDeploymentConfigTest {
  private final ApplicationContextRunner application =
      new ApplicationContextRunner()
          .withInitializer(new ConfigDataApplicationContextInitializer())
          .withPropertyValues(
              "spring.profiles.active=prod",
              "FRONTEND_URL=https://hicaptain.dev",
              "BACKEND_URL=https://blueprint-dev.onrender.com",
              "CORS_ALLOWED_ORIGINS=https://hicaptain.dev,https://www.hicaptain.dev")
          .withUserConfiguration(CorsConfig.class);

  @Test
  void renderPortAndCallbackOriginsResolveFromDeploymentVariables() {
    application
        .withInitializer(
            context ->
                context
                    .getEnvironment()
                    .getPropertySources()
                    .addFirst(
                        new SystemEnvironmentPropertySource(
                            "renderEnvironment", Map.of("PORT", "10000"))))
        .run(
            context -> {
              assertThat(context).hasNotFailed();
              var environment = context.getEnvironment();
              assertThat(environment.getProperty("server.port")).isEqualTo("10000");
              assertThat(environment.getProperty("server.forward-headers-strategy"))
                  .isEqualTo("framework");
              assertThat(environment.getProperty("logging.level.org.springframework.security"))
                  .isEqualTo("INFO");
              assertThat(environment.getProperty("github.oauth.redirect-uri"))
                  .isEqualTo("https://blueprint-dev.onrender.com/api/auth/github/callback");
              assertThat(environment.getProperty("auth.google.redirect-uri"))
                  .isEqualTo("https://blueprint-dev.onrender.com/auth/oauth/google/callback");
              assertThat(environment.getProperty("google.workspace.redirect-uri"))
                  .isEqualTo(
                      "https://blueprint-dev.onrender.com/api/google-calendar/auth/callback");
            });
  }

  @Test
  void existingLocalServerPortStillWorks() {
    application
        .withInitializer(
            context ->
                context
                    .getEnvironment()
                    .getPropertySources()
                    .addFirst(
                        new SystemEnvironmentPropertySource(
                            "localEnvironment", Map.of("SERVER_PORT", "8087"))))
        .run(
            context ->
                assertThat(context.getEnvironment().getProperty("server.port")).isEqualTo("8087"));
  }

  @Test
  void productionCorsAllowsCredentialsAndProfilePatchButRejectsOtherOrigins() {
    application.run(
        context -> {
          var mvc =
              MockMvcBuilders.standaloneSetup(new ProfileProbe())
                  .addFilters(new CorsFilter(context.getBean(CorsConfigurationSource.class)))
                  .build();
          for (String origin :
              new String[] {"https://hicaptain.dev", "https://www.hicaptain.dev"}) {
            mvc.perform(
                    options("/profile")
                        .header(HttpHeaders.ORIGIN, origin)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
                        .header(
                            HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS,
                            "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
          }
          mvc.perform(patch("/profile").header(HttpHeaders.ORIGIN, "https://hicaptain.dev"))
              .andExpect(status().isOk())
              .andExpect(content().string("updated"));
          for (String origin :
              new String[] {"https://unrelated.example", "http://localhost:3000"}) {
            mvc.perform(
                    options("/profile")
                        .header(HttpHeaders.ORIGIN, origin)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
          }
        });
  }

  @Test
  void wildcardCredentialOriginsAreRejected() {
    assertThrows(IllegalArgumentException.class, () -> new CorsConfig("*"));
    assertThrows(IllegalArgumentException.class, () -> new CorsConfig("https://*.example.com"));
    assertThrows(IllegalArgumentException.class, () -> new CorsConfig(" , "));
  }

  @RestController
  static class ProfileProbe {
    @PatchMapping("/profile")
    String update() {
      return "updated";
    }
  }
}
