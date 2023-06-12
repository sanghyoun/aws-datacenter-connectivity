# 하이브리드 클라우드 운영

오늘은 온프레미스 인프라와 AWS를 연계하는 하이브리드 클라우드 운영을 알아보도록 하겠습니다.<br>
대개의 경우 클라우드 마이그레이션 과정은 단기간에 마무리되지 않으므로, 기존의 IT 환경과 (예: 온프레미스 데이터센터)와 일정 기간 연계하여 운영하는 것이 일반적입니다.

온프레미스 데이터센터와 AWS 클라우드를 연결하는 기술은 일반적으로 Site-to-Site VPN이나 Direct Connect 등을 사용하며, 이렇게 연결된 후에는 다양한 형태의 IT 인프라가 논리적/물리적으로 연계되게 됩니다.

오늘은 Site-to-Site VPN을 사용하여 가상의 온프레미스 데이터센터와 AWS 클라우를 연결하고 이를 바탕으로 DNS를 연계시켜 보도록 하겠습니다.

참고로 이 핸즈온 가이드는 아래 두 워크샵을 조합하여 정리한 것입니다.<br>
- [Networking Immersion Day](https://catalog.workshops.aws/networking/en-US/beginner/lab1)
- [하이브리드 DNS](https://aws-labs.net/winlab0-buildinfra/hybriddns.html)

## Agenda

1. 환경 구성 (2인 1조)<br>
   - [AWS 클라우드 측 구성](./docs/aws-cloud-setup.md)
   - 데이터센터 측 구성
2. 
- Monolith - TravelBuddy 마이그레이션
  - 이론: Monolith란?
  - 실습 환경 구성
  - 실습 1: TravelBuddy 애플리케이션 컨테이너화
  - 실습 2: Database 구성
  - 실습 3: TravelBuddy 애플리케이션을 EKS에 배포
- Microservice - HotelSpecial 애플리케이션
  - 이론: Microservice란?
  - 실습 B: Strangler Fig Pattern - FlightSpecial 애플리케이션을 분리

## "TravleBuddy" 소개
"TravelBuddy"는 관광 및 여행 전문 서비스 회사로서 동명의 "TravelBuddy"라는 애플리케이션을 통해 다양한 관광, 여행, 숙박 관련 서비스를 제공하고 있습니다.<br>

이 회사가 운영하는 "TravelBuddy" 애플리케이션은 사용자 친화적인 기능과 인터페이스를 통해 많은 고객을 유치함으로써 회사의 성장에 크게 기여하였습니다.<br>
하지만 고객이 늘어나고 회사가 성장함에 따라 시스템에 발생하는 장애도 함께 증가하고 있으며, 유연하지 못한 시스템 구조로 인한 신규 서비스 출시 지연은 브지니스 민첩성마저 저하시키고 있습니다.<br>

이 실습에서는 애플리케이션 현대화의 첫 번째 단계로서 기존 온프레미스 (On-Premise)에서 운영하던 가상의 웹 애플리케이션을 AWS 클라우드 환경으로 옮겨서 배포하고자 합니다.<br>
현행 어플리케이션은 Java Spring Boot 기반으로 구현되어 있으며, 고객은 우선 컨테이너를 통한 Replatfom을 통하여 클라우드에서 기능이 잘 동작하는지 확인함으로써 클라우드 이전의 위험성을 줄이고 싶어 합니다.<br>
그리고 이후 점진적으로 애플리케이션 현대화를 수행해 나갈 예정입니다.

## TravelBuddy 마이그레이션
이번 실습을 진행하면서 우리는 [TravelBuddy.zip](https://workshops.devax.academy/monoliths-to-microservices/module1/files/TravelBuddy.zip)라는 가상의 웹 애플리케이션을 활용하여 마이크로서비스 아키텍처로 전환하는 예제로 사용할 것입니다.

![travelbuddy.png](./docs/assets/travelbuddy.png)

이 실습을 통해 다음의 Topic을 다룰 것입니다.
- AWS 환경에서 개발 및 배포 등의 작업을 수행하기 위해서 Cloud9을 사용
- 1단계: 리플랫폼 (Replatform)
  - EKS 클러스터를 생성. 이 때 빌드/전달 (Build/Delivery) 파이프라인 및 배포 (Deploy) 파이프라인도 함께 생성
  - 위 두 파이프라인을 분리함으로써 Push 기반의 GitOps 체계 도입
    - (참고) [데브옵스의 확장 모델](https://www.samsungsds.com/kr/insights/gitops.html)
  - Monolith인 TravelBuddy 애플리케이션을 컨테이너화하고 컨테이너 이미지를 ECR에 푸시
- 2단계: 리팩터 (Refactor Piloting)
  - Monolith 개념을 이해하고 TravelBuddy 애플리케이션을 분석하여 개선 방향을 검토
  - Microservice 개념을 이해하고 HotelSpecial 애플리케이션을 통해 분리하는 과정을 체험
  - (옵션) Pull 기반의 GitOps 구조를 구축 (ArgoCD)
  - FlightSpecial 애플리케이션을 직접 개발하면서 학습 내용을 복습

또한 필요하다면 다음과 같은 주제를 함께 토론해 보면 좋을 것 같습니다.<br>
- 도메인 주도 설계 (Domain-Driven Design)
- Layered Architecture 및 SOLID 원칙
- IRSA (IAM Role for Service Account)

### 실습 환경 구성
- 먼저 [Cloud9 환경 구성하기](./docs/cloud9.md)를 합니다.
- 다음으로 [EKS Cluster를 생성 (CDK 사용)](./docs/eks-cluster-cdk.md)합니다.

### 실습 1: TravelBuddy 애플리케이션 컨테이너화, 빌드 및 전달 (ECR 푸시)

- [TravelBuddy 컨테이너화, 빌드 및 전달](./docs/containerize.md) 내용에 따라서 컨테이너 이미지를 생성합니다.

### 실습 2: Database 구성

- 클라우드 환경에 [데이터베이스를 구성](./docs/database.md)합니다.

### 실습 3: TravelBuddy 애플리케이션을 EKS에 배포

- 컨테이너화 한 TravelBuddy 애플리케이션을 [EKS에 배포](./docs/deploy.md)합니다.

## Monolith란?

[Monolith](./docs/monolith.md)의 개념을 간단히 살펴보고 몇 가지 개선 방법을 알아봅니다.

## Microservice란?

[Microservice](./docs/microservices.md)의 개념을 간단히 살펴보고, 어떤 경우에 마이크로서비스가 필요한지 토론해봅니다.

## 실습 4: FlightSpecial Microservice 애플리케이션

- Layered Architecture를 반영한 [Package 구조](./docs/package.md)를 살펴봅니다.
- Docker Compose를 활용하여 Sandbox 환경을 구성하는 방법을 알아봅니다.

### 실습 5: Strangler Fig Pattern - HotelSpecial 애플리케이션을 분리
- FlightSpecial 프로젝트를 참고하여 직접 HotelSpecial 애플리케이션을 제작합니다.
- 이 과정을 통해서 앞에서 학습한 세부 기술들을 익히고 내재화합니다.
